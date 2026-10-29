import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import type { EvaluationRecord, RiskCriterion, FactorWeight, RegulatoryThreshold, OrganizationSettings } from '../src/types';

export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(),
  documentKey: text('document_key').notNull(), taxId: text('tax_id').notNull(),
  subjectName: text('subject_name').notNull(), subjectType: text('subject_type').notNull(),
  address: text('address').notNull().default(''), email: text('email').notNull().default(''), phone: text('phone').notNull().default(''),
  activity: text('activity').notNull().default(''), pepStatus: integer('pep_status', {mode:'boolean'}).notNull().default(false), pepDetails: text('pep_details').notNull().default(''),
  clientCriteriaIds: text('client_criteria_ids',{mode:'json'}).$type<string[]>().notNull().default([]),
  createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
}, t => [uniqueIndex('subjects_owner_document').on(t.ownerId,t.documentKey), index('subjects_owner_name').on(t.ownerId,t.subjectName)]);
export const evaluations = sqliteTable('evaluations', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(),
  subjectId: text('subject_id').references(()=>subjects.id), createdAt: text('created_at').notNull(),
  record: text('record', {mode:'json'}).$type<EvaluationRecord>().notNull(),
}, t=>[index('evaluations_owner').on(t.ownerId),index('evaluations_subject').on(t.subjectId)]);
export const settings = sqliteTable('risk_settings', {
  ownerId: text('owner_id').primaryKey(),
  criteria: text('criteria',{mode:'json'}).$type<RiskCriterion[]>().notNull(),
  factorWeights: text('factor_weights',{mode:'json'}).$type<FactorWeight[]>().notNull(),
  thresholds: text('thresholds',{mode:'json'}).$type<RegulatoryThreshold[]>().notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const organizationSettings=sqliteTable('organization_settings',{
 ownerId:text('owner_id').primaryKey(),
 organization:text('organization',{mode:'json'}).$type<OrganizationSettings>().notNull(),
 updatedAt:text('updated_at').notNull(),
});

export const appUsers=sqliteTable('app_users',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),email:text('email').notNull(),name:text('name').notNull(),
 role:text('role').$type<import('../src/access').AccessUser['role']>().notNull(),
 active:integer('active',{mode:'boolean'}).notNull().default(true),grants:text('grants',{mode:'json'}).$type<import('../src/access').Grants>().notNull(),
 updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('app_users_email').on(t.email)]);
