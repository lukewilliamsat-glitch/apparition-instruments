import {aftercareDatabase} from './aftercare-database.mjs';import {readFileSync} from 'node:fs';
export const templateMigration=()=>readFileSync(new URL('../../supabase/migrations/20261008152227_email_template_studio_giga_v1.sql',import.meta.url),'utf8');
export async function emailTemplateDatabase(){const fixture=await aftercareDatabase();await fixture.db.exec(templateMigration());return fixture;}
