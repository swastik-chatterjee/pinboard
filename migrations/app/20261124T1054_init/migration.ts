#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/c37d82ca77503f7e57685b83d64bc9af922331c1baf4577b17ea991208d7d6d2/contract';
import endContract from '../../snapshots/c37d82ca77503f7e57685b83d64bc9af922331c1baf4577b17ea991208d7d6d2/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'PostStatus',
        members: ['LIVE', 'HIDDEN', 'DELETED'],
      }),
      this.createTable({
        schema: 'public',
        table: 'Heart',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('deviceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('postId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'KindnessPost',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('deviceFp', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('firstName', 'text', {
            notNull: true,
            default: lit(''),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('gridKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('hearts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lat', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('lng', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('message', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('secretHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', '"PostStatus"', {
            notNull: true,
            default: lit('LIVE'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'PostStatus' } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'RateBus',
        columns: [
          col('count', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Report',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', {
            notNull: true,
            default: lit(''),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('postId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reason', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reporterD', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('resolved', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Heart',
        index: 'Heart_postId_deviceId_key',
        columns: ['postId', 'deviceId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'KindnessPost',
        index: 'KindnessPost_createdAt_idx',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'KindnessPost',
        index: 'KindnessPost_deviceFp_createdAt_idx',
        columns: ['deviceFp', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'KindnessPost',
        index: 'KindnessPost_lat_lng_idx',
        columns: ['lat', 'lng'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'RateBus',
        index: 'RateBus_key_key',
        columns: ['key'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Report',
        index: 'Report_postId_createdAt_idx',
        columns: ['postId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Report',
        index: 'Report_postId_reporterD_key',
        columns: ['postId', 'reporterD'],
        extras: { unique: true },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
