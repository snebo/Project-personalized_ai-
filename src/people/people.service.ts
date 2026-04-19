import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Person } from './entities/person.entity';

@Injectable()
export class PeopleService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,
  ) {}

  async findByNameAndUser(
    name: string,
    user_id: string,
  ): Promise<Person | null> {
    return this.personRepo.findOne({
      where: { name, user_id },
    });
  }

  async create(data: Partial<Person>): Promise<Person> {
    const person = this.personRepo.create(data);
    return this.personRepo.save(person);
  }

  async update(
    id: string,
    user_id: string,
    data: Partial<Person>,
  ): Promise<Person | null> {
    await this.personRepo.update({ id, user_id }, data);
    return this.personRepo.findOne({ where: { id, user_id } });
  }

  async findById(id: string, user_id: string): Promise<Person | null> {
    return this.personRepo.findOne({ where: { id, user_id } });
  }

  async findAllForUser(user_id: string): Promise<Person[]> {
    return this.personRepo.find({ where: { user_id } });
  }

  /**
   * Returns people whose names appear in the message text.
   * Matching happens in SQL, scoped to the current user.
   */
  async findMentionedPeople(user_id: string, text: string): Promise<Person[]> {
    const normalized = (text || '').trim().toLowerCase();
    if (!normalized) return [];

    return this.personRepo
      .createQueryBuilder('person')
      .where('person.user_id = :user_id', { user_id })
      .andWhere(
        new Brackets((qb) => {
          qb.where(":text LIKE CONCAT('%', LOWER(person.name), '%')", {
            text: normalized,
          });
        }),
      )
      .orderBy('LENGTH(person.name)', 'DESC')
      .getMany();
  }
}
