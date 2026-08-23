import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { BookService } from '@saas/core-platform';
import { RequirePermission } from '../../identity/security/require-permission.decorator';
import type { Request } from 'express';

@Controller('v1/library/books')
export class BooksController {
  constructor(private readonly bookService: BookService) {}

  @Post()
  @RequirePermission('library.manage_books')
  async createBook(@Req() req: Request, @Body() body: any) {
    return this.bookService.createBook({
      tenantId: (req.user as any).tenantId,
      ...body,
    });
  }

  @Get()
  @RequirePermission('library.view')
  async listBooks(@Req() req: Request, @Query() query: any) {
    return this.bookService.listBooks((req.user as any).tenantId, query);
  }

  @Get(':id')
  @RequirePermission('library.view')
  async getBook(@Req() req: Request, @Param('id') id: string) {
    return this.bookService.getBook((req.user as any).tenantId, id);
  }
}
