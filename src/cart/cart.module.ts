import { forwardRef, Module } from '@nestjs/common';
import { OrdersModule } from 'src/orders/orders.module';
import { ProductsModule } from 'src/products/products.module';
import { SendgridModule } from 'src/sendgrid/sendgrid.module';
import { VendorsModule } from 'src/vendors/vendors.module';
import { CartResolver } from './cart.resolver';
import { CartService } from './cart.service';
import { CartItemService } from './services/cart-item.service';

@Module({
  imports: [
    ProductsModule,
    forwardRef(() => OrdersModule),
    VendorsModule,
    SendgridModule,
  ],
  providers: [CartItemService, CartService, CartResolver],
  exports: [CartService],
})
export class CartModule {}
