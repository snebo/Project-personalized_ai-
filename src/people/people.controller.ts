import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PeopleService } from './people.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreatePersonDto, UpdatePersonDto } from './dto/create-person.dto';

@Controller('people')
@UseGuards(AuthGuard)
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreatePersonDto) {
    return this.peopleService.create({ ...dto, user_id: req.user.sub });
  }

  @Get('search')
  findByName(@Request() req: any, @Query('name') name: string) {
    return this.peopleService.findByNameAndUser(name, req.user.sub);
  }

  @Get(':id')
  findById(@Param('id') id: string, @Request() req: any) {
    return this.peopleService.findById(id, req.user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdatePersonDto,
  ) {
    return this.peopleService.update(id, req.user.sub, dto);
  }
}
