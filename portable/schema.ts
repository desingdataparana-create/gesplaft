import { pgTable, text, boolean, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import type { EvaluationRecord, RiskCriterion, FactorWeight, RegulatoryThreshold, OrganizationSettings } from '../src/types';

export const subjects = pgTable('subjects', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(),
  documentKey: text('document_key').notNull(), taxId: text('tax_id').notNull(),
  subjectName: text('subject_name').notNull(), subjectType: text('subject_type').notNull(),
  address: text('address').notNull().default(''), email: text('email').notNull().default(''), phone: text('phone').notNull().default(''),
  activity: text('activity').notNull().default(''), pepStatus: boolean('pep_status').notNull().default(false), pepDetails: text('pep_details').notNull().default(''),
  clientCriteriaIds: jsonb('client_criteria_ids').$type<string[]>().notNull().default([]),
  createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
}, t => [uniqueIndex('subjects_owner_document').on(t.ownerId,t.documentKey), index('subjects_owner_name').on(t.ownerId,t.subjectName)]);
export const evaluations = pgTable('evaluations', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(),
  subjectId: text('subject_id').references(()=>subjects.id), createdAt: text('created_at').notNull(),
  record: jsonb('record').$type<EvaluationRecord>().notNull(),
}, t=>[index('evaluations_owner').on(t.ownerId),index('evaluations_subject').on(t.subjectId)]);
export const settings = pgTable('risk_settings', {
  ownerId: text('owner_id').primaryKey(),
  criteria: jsonb('criteria').$type<RiskCriterion[]>().notNull(),
  factorWeights: jsonb('factor_weights').$type<FactorWeight[]>().notNull(),
  thresholds: jsonb('thresholds').$type<RegulatoryThreshold[]>().notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const organizationSettings=pgTable('organization_settings',{
 ownerId:text('owner_id').primaryKey(),
 organization:jsonb('organization').$type<OrganizationSettings>().notNull(),
 updatedAt:text('updated_at').notNull(),
});

export const appUsers=pgTable('app_users',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),email:text('email').notNull(),name:text('name').notNull(),
 role:text('role').$type<import('../src/access').AccessUser['role']>().notNull(),
 active:boolean('active').notNull().default(true),grants:jsonb('grants').$type<import('../src/access').Grants>().notNull(),
 updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('app_users_email').on(t.email)]);
