import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import {
  DeliveryMethods,
  PaymentMethods,
  VendorInfo,
  Location,
  VendorBankInfo,
  VendorSettings,
} from '@prisma/client';
import { IsEmail } from 'class-validator';
import { LocationInput } from 'src/products/dto/location.input';
import { DeliveryAreas } from '../models/vendor-settings.model';
import { AddDeliveryAreasInput } from './add-delivery-areas.input';
import { AddSubscriptionInput } from './add-subscription-input';

registerEnumType(DeliveryMethods, {
  name: 'DeliveryMethods',
  description: 'Delivery Methods',
});

registerEnumType(PaymentMethods, {
  name: 'PaymentMethods',
  description: 'Payment Methods',
});

@InputType()
class Certificate {
  @Field()
  title: string;

  @Field()
  image: string;
}

@InputType()
class UpdateVendorInfoInput implements VendorInfo {
  @Field({ nullable: true })
  address: string;

  @Field({ nullable: true })
  phone: string;

  @Field({ nullable: true })
  @IsEmail()
  email: string;

  @Field({ nullable: true })
  addressUrl: string;

  @Field({ nullable: true })
  description: string;

  @Field({ nullable: true })
  description_ar: string;

  @Field({ nullable: true })
  heroImage: string;

  @Field({ nullable: true })
  logo: string;

  @Field({ nullable: true })
  terms: string;

  @Field(() => LocationInput, { nullable: true })
  location: Location;

  @Field(() => [Certificate], { nullable: true })
  certificates: Certificate[];

  @Field({ nullable: true })
  instagram: string;

  @Field({ nullable: true })
  facebook: string;

  @Field({ nullable: true })
  snapchat: string;

  @Field({ nullable: true })
  whatsapp: string;

  @Field({ nullable: true })
  vatNum: string;

  @Field({ nullable: true })
  crNum: string;
}

@InputType()
class UpdateVendorBankInput implements VendorBankInfo {
  @Field()
  bankName: string;

  @Field()
  iban: string;

  @Field()
  accountNumber: string;

  @Field()
  beneficiary: string;
}

@InputType()
class UpdateVendorSettingsInput implements VendorSettings {
  @Field(() => [PaymentMethods], { nullable: true })
  paymentMethods: PaymentMethods[];

  @Field(() => [DeliveryMethods], { nullable: true })
  deliveryMethods: DeliveryMethods[];

  @Field(() => [AddDeliveryAreasInput], { nullable: true })
  deliveryAreas: DeliveryAreas[];
}

@InputType()
export class UpdateVendorInput {
  @Field()
  name?: string;

  @Field({ nullable: true })
  name_ar: string;

  @Field()
  active?: boolean;

  @Field()
  info?: UpdateVendorInfoInput;

  @Field()
  bank?: UpdateVendorBankInput;

  @Field()
  settings?: UpdateVendorSettingsInput;

  @Field(() => AddSubscriptionInput, { nullable: true })
  subscription?: AddSubscriptionInput;
}
