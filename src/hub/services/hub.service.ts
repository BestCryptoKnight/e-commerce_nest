import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Prisma, AttendanceType } from '@prisma/client';

import { throwNotFoundException } from 'src/utils/validation';
import getPaginationArgs from 'src/common/helpers/getPaginationArgs';
import { GetProductArgs } from '../dto/product';
import { PaginatedProducts } from 'src/products/models/paginated-products.model';
import { GetVendorsArgs } from '../dto/vendor';
import { PaginatedVendors } from '../models/vendor';

@Injectable()
export class HubService {
  constructor(private readonly prisma: PrismaService) {}

  getProducts = async ({
    vendorId,
    categoryId,
    pg,
    sortOrder,
    filter,
  }: GetProductArgs): Promise<PaginatedProducts> => {
    try {
      const { skip, take } = getPaginationArgs(pg);
      const where: Prisma.ProductWhereInput = { ...filter };
      const orderBy = { createdAt: Prisma.SortOrder.asc };

      if (sortOrder) orderBy[sortOrder.field] = sortOrder.direction;

      if (vendorId) {
        where['vendorId'] = { in: vendorId.split(',') };
      }

      if (categoryId) {
        where['categoryId'] = { in: categoryId.split(',') };
      }

      const products = await this.prisma.product.findMany({
        where,
        skip,
        take: take || undefined,
        orderBy,
      });

      throwNotFoundException(products?.length, '', 'No product available');

      const list = [];
      for (const product of products) {
        product.badge = {
          ...product?.badge,
          label: product.meetingLink
            ? AttendanceType.ONLINE
            : AttendanceType.PHYSICAL,
        };

        const quantity = await this.prisma.workshop.aggregate({
          where: { productId: product.id },
          _sum: { quantity: true },
        });

        if (quantity?._sum?.quantity) {
          product.bookedSeats += quantity?._sum?.quantity;
        }

        list.push(product);
      }

      const totalCount = await this.prisma.product.count({ where });

      return {
        list,
        totalCount: totalCount || 0,
      };
    } catch (err) {
      throw new Error(err);
    }
  };

  getVendors = async ({
    pg,
    sortOrder,
    filter,
  }: GetVendorsArgs): Promise<PaginatedVendors> => {
    try {
      const { skip, take } = getPaginationArgs(pg);
      let where: Prisma.VendorWhereInput = {};
      const orderBy = { createdAt: Prisma.SortOrder.asc };

      if (sortOrder) orderBy[sortOrder.field] = sortOrder.direction;

      if (typeof filter.active === 'boolean')
        where = { ...where, active: filter.active };

      if (filter?.vendorId?.length)
        where = { ...where, id: { in: filter?.vendorId } };

      if (filter?.name?.length)
        where = { ...where, name: { in: filter?.name } };

      if (filter?.name_ar?.length)
        where = { ...where, name_ar: { in: filter?.name_ar } };

      if (filter?.slug?.length)
        where = { ...where, slug: { in: filter?.slug } };

      if (filter?.email?.length)
        where = { ...where, info: { email: filter?.email } };

      const vendors = await this.prisma.vendor.findMany({
        where,
        skip,
        take: take || undefined,
        orderBy,
      });

      throwNotFoundException(vendors?.length, '', 'No vendor available');

      const totalCount = await this.prisma.vendor.count({ where });

      return {
        list: vendors,
        totalCount: totalCount || 0,
      };
    } catch (err) {
      throw new Error(err);
    }
  };
}
