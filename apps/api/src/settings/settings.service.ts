import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const DEFAULT_SETTINGS = [
  { key: 'company.name', value: 'Tashgheel HRMS', group: 'company' },
  { key: 'company.logo', value: '', group: 'company' },
  { key: 'company.address', value: '', group: 'company' },
  { key: 'company.timezone', value: 'UTC', group: 'company' },
  { key: 'company.currency', value: 'SAR', group: 'company' },
  { key: 'company.country', value: 'Saudi Arabia', group: 'company' },
  { key: 'branding.primary_color', value: '#2A2C4E', group: 'branding' },
  { key: 'branding.favicon', value: '', group: 'branding' },
  { key: 'email.from_name', value: 'Tashgheel Admin', group: 'email' },
  { key: 'email.from_address', value: 'admin@tashgheel.com', group: 'email' },
  { key: 'system.default_language', value: 'ar', group: 'system' },
  { key: 'system.date_format', value: 'YYYY-MM-DD', group: 'system' },
  { key: 'system.pagination_limit', value: '20', group: 'system' },
];

@Injectable()
export class SettingsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    // 1. Get existing settings from DB
    const dbSettings = await this.db.setting.findMany();
    const settingsMap = new Map(dbSettings.map((s) => [s.key, s]));

    // 2. Build merged settings (DB values take priority over defaults)
    const result: Record<string, Record<string, string>> = {};

    for (const def of DEFAULT_SETTINGS) {
      if (!result[def.group]) {
        result[def.group] = {};
      }
      const existing = settingsMap.get(def.key);
      result[def.group][def.key] = existing ? existing.value : def.value;
    }

    // Include any additional settings that might be in DB but not in defaults
    for (const dbSetting of dbSettings) {
      if (!result[dbSetting.group]) {
        result[dbSetting.group] = {};
      }
      result[dbSetting.group][dbSetting.key] = dbSetting.value;
    }

    return result;
  }

  async update(dto: UpdateSettingsDto, actorId: string) {
    const updatedSettings: Record<string, string> = {};
    const beforeSettings: Record<string, string> = {};

    // Get current values for audit log
    const keys = Object.keys(dto.settings);
    const existing = await this.db.setting.findMany({
      where: { key: { in: keys } },
    });
    const existingMap = new Map(existing.map((s) => [s.key, s.value]));

    await this.db.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(dto.settings)) {
        // Determine the group
        let group = 'system';
        const def = DEFAULT_SETTINGS.find((d) => d.key === key);
        if (def) {
          group = def.group;
        } else {
          const parts = key.split('.');
          if (parts.length > 1) {
            group = parts[0];
          }
        }

        beforeSettings[key] = existingMap.get(key) ?? '';

        await tx.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value, group },
        });

        updatedSettings[key] = value;
      }

      // Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'UPDATE_SETTINGS',
          resource: 'Setting',
          resourceId: 'global',
          beforeValue: beforeSettings,
          afterValue: updatedSettings,
        },
      });
    });

    return { success: true, settings: updatedSettings };
  }
}
