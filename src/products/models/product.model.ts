import { Field, ObjectType, Int } from '@nestjs/graphql';
import { Category } from 'src/categories/models/category.model';
import { BaseModel } from 'src/common/models/base.model';
import { Vendor } from 'src/vendors/models/vendor.model';
import { Product as IProduct } from '@prisma/client';
import {
  ProductType,
  AttendanceType,
  BadgeType as Btype,
} from 'prisma/prisma-client';
import { Tag } from 'src/tags/models/tag.model';
import './product-type.enum';
import { Variant } from './variant.model';
import { Form } from 'src/forms/models/forms.model';

@ObjectType()
export class BadgeType implements Btype {
  @Field(() => AttendanceType)
  label: AttendanceType;
}
@ObjectType()
export class Product extends BaseModel implements IProduct {
  slug: string;
  title: string;
  title_ar: string;

  description: string;
  description_ar: string;

  @Field(() => ProductType)
  type: ProductType;

  image: string;

  vendorId: string;

  @Field(() => Vendor, { nullable: false })
  vendor?: Vendor;

  categoryId: string;

  @Field(() => Category, { nullable: true })
  category?: Category;

  active: boolean;

  @Field(() => Int, { nullable: true })
  minPreorderDays: number;

  @Field(() => [Variant], { nullable: true })
  variants: Variant[];

  tagIds: string[];

  @Field(() => [Tag], { nullable: true })
  tags?: Tag[];

  @Field(() => Int, { nullable: true })
  noOfSeats: number;

  @Field(() => Int, { nullable: true })
  bookedSeats: number;

  @Field(() => Int, { nullable: true })
  itemsInStock: number;

  @Field(() => Int, { nullable: true })
  sortOrder: number;

  @Field(() => AttendanceType, { nullable: true })
  attendanceType: AttendanceType;

  formId: string;
  @Field(() => Form, { nullable: true })
  form?: Form;

  @Field(() => BadgeType, { nullable: true })
  badge: BadgeType;

  @Field({ nullable: true })
  meetingLink: string;

  @Field({ nullable: true })
  location: string;

  @Field({ nullable: true })
  endTime: boolean;

  @Field({ nullable: true })
  customerLocation: boolean;

  @Field({ nullable: true })
  duration: number;

  startDate: Date;
  endDate: Date;
}
