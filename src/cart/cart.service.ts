import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Cart } from './models/cart.model';

import { CartItemInput } from './dto/cart.input';
import {
  OrderStatus,
  PaymentMethods,
  Prisma,
  ProductType,
} from '@prisma/client';
import { CartItemService } from './services/cart-item.service';
import { find, omit } from 'lodash';
import { VendorsService } from 'src/vendors/vendors.service';
import { nanoid } from 'nanoid';
import { SendgridService } from 'src/sendgrid/sendgrid.service';
import { ORDER_OPTIONS, SendEmails } from 'src/utils/email';
import { PaymentService } from 'src/payment/payment.service';
import { ProductsService } from 'src/products/services/products.service';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartItemService: CartItemService,
    private readonly vendorService: VendorsService,
    private readonly emailService: SendgridService,
    private readonly paymentService: PaymentService,
    private readonly productService: ProductsService
  ) {}

  async createNewCart(vendorId: string, customerId: string): Promise<Cart> {
    return await this.prisma.cart.create({
      data: {
        customerId,
        vendorId,
        finalPrice: 0,
        totalPrice: 0,
        items: [],
      },
    });
  }

  async getCart(cartId: string): Promise<Cart | null> {
    if (!cartId) return null;
    return await this.prisma.cart.findUnique({
      where: { id: cartId },
    });
  }

  async getCartByCustomer(customerId: string, vendorId: string): Promise<Cart> {
    return this.prisma.cart.findFirst({
      where: {
        customerId: customerId.toString(),
        vendorId: vendorId.toString(),
      },
    });
  }

  async updateCartPrice(
    cartId: string,
    prices: { totalPrice: number }
  ): Promise<Cart> {
    return await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        ...prices,
      },
    });
  }

  async addItemToCart(cartId: string, data: CartItemInput) {
    const cart = await this.getCart(cartId);

    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: data.productId },
    });

    let cartData: Prisma.CartUpdateArgs['data'] = {};

    switch (product.type) {
      case ProductType.PRODUCT:
        cartData = this.cartItemService.addProduct(product, cart, data);
        break;
      case ProductType.WORKSHOP:
        cartData = await this.cartItemService.addWorkshopToCart(
          product,
          cart,
          data
        );
        break;
      case ProductType.SERVICE:
        cartData = await this.cartItemService.addServiceToCart(
          product,
          cart,
          data
        );
      default:
        break;
    }

    return this.prisma.cart.update({
      where: { id: cartId },
      data: omit(cartData, ['id']),
    });
  }

  async removeItemFromCart(cartId: string, productId: string, sku: string) {
    const cart = await this.getCart(cartId);

    const items = cart.items.filter(
      (item) => item.productId !== productId || item.sku !== sku
    );

    const totalPrice = items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    return this.prisma.cart.update({
      where: { id: cartId },
      data: {
        items,
        totalPrice,
      },
    });
  }

  async updateCartItem(cartId: string, data: CartItemInput) {
    const cart = await this.getCart(cartId);
    const newItem = {
      ...find(cart.items, {
        productId: data.productId,
        sku: data.sku,
      }),
      ...data,
    };

    const items = cart.items.map((item) =>
      item.productId === data.productId && item.sku === data.sku
        ? newItem
        : item
    );

    const totalPrice = items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    const updatedCart = this.prisma.cart.update({
      where: { id: cartId },
      data: {
        items,
        totalPrice,
      },
    });
    const updatedCartItem: any = await Promise.all(
      cart.items.map(async (item) => {
        const product = await this.productService.getProduct(item.productId);
        return { ...product, ...item };
      })
    );
    updatedCart.items = updatedCartItem;

    return updatedCart;
  }

  async getCartAndDelete(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });
    if (!cart) throw new BadRequestException('Cart doesnt exists');

    if (!cart?.consigneeAddress)
      throw new BadRequestException(
        'Consignee Address doenst exist for the cart'
      );

    // cart deletion
    await this.prisma.cart.delete({
      where: { id: cartId },
    });

    return cart;
  }

  //this should not type any, but this was generating error on assigning it a type
  async updateCart(cartId: string, data: any) {
    return this.prisma.cart.update({
      where: { id: cartId },
      data: data,
    });
  }

  async checkoutCartAndCreateOrder(cartId: string, paymentSession?: string) {
    const cart = await this.getCart(cartId);
    const isOnlinePayment = cart.paymentMethod === PaymentMethods.ONLINE;

    if (!cart.deliveryMethod) {
      throw new BadRequestException('delivery method is required');
    } else if (!cart.paymentMethod) {
      throw new BadRequestException('Payment method is required');
    } else if (isOnlinePayment && !paymentSession) {
      throw new BadRequestException('Payment session is required');
    }

    const { vendorId } = cart;

    const vendorPrefix = await this.vendorService.getVendorOrderPrefix(
      vendorId
    );
    const vendor = await this.vendorService.getVendor(vendorId);

    const orderId = `${vendorPrefix}-${nanoid(8)}`.toUpperCase();

    let order = await this.prisma.order.findFirst({
      where: {
        cartId,
      },
    });

    if (!order) {
      order = await this.prisma.order.create({
        data: {
          orderId,
          items: cart.items,
          customerId: cart.customerId,
          customerInfo: cart.customerInfo,
          paymentMethod: cart.paymentMethod,
          appliedCoupon: cart.appliedCoupon,
          ...(cart.deliveryMethod && {
            deliveryMethod: cart.deliveryMethod,
          }),
          ...(cart.consigneeAddress && {
            consigneeAddress: cart.consigneeAddress,
          }),
          ...(cart.shipperAddress && {
            shipperAddress: cart.shipperAddress,
          }),
          finalPrice: cart.totalPrice,
          totalPrice: cart.totalPrice,
          status: OrderStatus[isOnlinePayment ? 'CREATED' : 'PENDING'],
          vendor: {
            connect: {
              id: vendorId,
            },
          },
          cart: {
            connect: {
              id: cartId,
            },
          },
        },
      });
    }

    let payment = undefined;
    let errors = undefined;

    if (isOnlinePayment) {
      try {
        payment = await this.paymentService.executePayment(
          order.id,
          paymentSession,
          vendor.slug
        );

        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            invoiceId: payment.InvoiceId.toString(),
          },
        });
      } catch (error) {
        errors = error.response.data.ValidationErrors;
      }
    }

    // Payment method is not ONLINE or online payment is successfully done
    if (errors === undefined) {
      await this.prisma.cart.delete({
        where: { id: cartId },
      });
    }

    // Email notification to vendor and customer when order is created
    if (order.id) {
      this.emailService.send(
        SendEmails(ORDER_OPTIONS.PURCHASED, order?.customerInfo?.email)
      );
      if (vendor?.info?.email)
        this.emailService.send(
          SendEmails(ORDER_OPTIONS.RECEIVED, vendor?.info?.email)
        );
    }

    return {
      ...order,
      payment,
      errors,
    };
  }
}