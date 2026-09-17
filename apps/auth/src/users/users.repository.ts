import { AbstractRepository } from '@app/common/database/abstract.repository';
import { Injectable, Logger } from '@nestjs/common';
import { UserDocument } from '../../../../libs/common/src/models/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';

@Injectable()
export class UsersRepository extends AbstractRepository<UserDocument> {
  protected readonly logger = new Logger(UsersRepository.name);

  constructor(@InjectModel(UserDocument.name) userModel: Model<UserDocument>) {
    super(userModel);
  }

  async checkIfUserNotExists(
    queryFilter: QueryFilter<UserDocument>,
  ): Promise<boolean> {
    const user = await this.model.findOne(queryFilter).lean(true);

    if (user) {
      return false;
    }

    return true;
  }
}
