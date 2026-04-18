import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Person } from './entities/person.entity';

@Injectable()
export class PeopleService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,
  ) {}

  async findByNameAndUser(name: string, user_id: string): Promise<Person | null> {
    return this.personRepo.findOne({
      where: { name, user_id },
    });
  }

  async create(data: Partial<Person>): Promise<Person> {
    const person = this.personRepo.create(data);
    return this.personRepo.save(person);
  }

  async update(id: string, user_id: string, data: Partial<Person>): Promise<Person | null> {
    await this.personRepo.update({ id, user_id }, data);
    return this.personRepo.findOne({ where: { id, user_id } });
  }

  async findById(id: string, user_id: string): Promise<Person | null> {
    return this.personRepo.findOne({ where: { id, user_id } });
  }
}
