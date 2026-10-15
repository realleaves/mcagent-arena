import { decode } from '@toon-format/toon';
import { z } from 'zod';
import { ArenaError } from '../../shared/src/errors.js';

const nutritionRow = z.object({
  productName: z.string().min(1).max(500),
  energyKcal: z.number().finite().nonnegative().nullable(),
});
const calendarData = z.object({
  dailyList: z
    .array(
      z.object({
        date: z.iso.date(),
        events: z.array(
          z.object({
            articleDto: z
              .object({ title: z.string().max(2000) })
              .nullable()
              .optional(),
          }),
        ),
      }),
    )
    .max(1000),
});
export interface LiveFood {
  id: string;
  name: string;
  energyKcal: number | null;
}
export interface LiveCalendarEntry {
  id: string;
  name: string;
  calendarDate: string;
}

function sourceData(result: unknown): unknown {
  const object = z.record(z.string(), z.unknown()).safeParse(result);
  if (!object.success) throw new ArenaError('LIVE_DATA_UNSUPPORTED', '官方工具结果不是对象');
  if (object.data.isError === true)
    throw new ArenaError('LIVE_DATA_UNSUPPORTED', '官方工具调用失败，不能按成功数据评分');
  const envelope = object.data.structuredContent ?? object.data;
  const parsedEnvelope = z.record(z.string(), z.unknown()).safeParse(envelope);
  if (!parsedEnvelope.success)
    throw new ArenaError('LIVE_DATA_UNSUPPORTED', '官方工具结构不是可解析的数据对象');
  const fields = parsedEnvelope.data;
  if (
    fields.success === false ||
    (typeof fields.code === 'number' && ![0, 200].includes(fields.code))
  )
    throw new ArenaError('LIVE_DATA_UNSUPPORTED', '官方工具结构不可用或返回业务失败');
  const payload = 'data' in fields ? fields.data : fields;
  if (typeof payload !== 'string') return payload;
  if (payload.length > 200000)
    throw new ArenaError('LIVE_DATA_LIMIT', '官方工具数据超过解析上限，未截断后评分');
  try {
    return JSON.parse(payload) as unknown;
  } catch {
    try {
      return decode(payload, { strict: true });
    } catch {
      throw new ArenaError('LIVE_DATA_UNSUPPORTED', '官方工具字符串无法完整解析为 JSON 或 TOON');
    }
  }
}

export function liveNutrition(result: unknown): LiveFood[] {
  const rows = z.array(nutritionRow).max(1000).safeParse(sourceData(result));
  if (!rows.success)
    throw new ArenaError('LIVE_DATA_UNSUPPORTED', '官方营养表字段不匹配，未按部分解析结果评分');
  return rows.data.map((r, index) => ({
    id: `nutrition-row-${index + 1}`,
    name: r.productName,
    energyKcal: r.energyKcal,
  }));
}

export function liveCalendar(result: unknown): LiveCalendarEntry[] {
  const parsed = calendarData.safeParse(sourceData(result));
  if (!parsed.success)
    throw new ArenaError('LIVE_DATA_UNSUPPORTED', '官方活动日历字段或日期不匹配');
  const entries: LiveCalendarEntry[] = [];
  for (const day of parsed.data.dailyList)
    for (const event of day.events) {
      const name = event.articleDto?.title;
      if (name?.trim())
        entries.push({ id: `calendar-entry-${entries.length + 1}`, name, calendarDate: day.date });
    }
  if (entries.length > 1000) throw new ArenaError('LIVE_DATA_LIMIT', '活动日历条目超过解析上限');
  return entries;
}

export function normalizedLiveView(toolName: string, result: unknown): unknown {
  const checkedView = (view: unknown) => {
    if (JSON.stringify(view).length > 60000)
      throw new ArenaError('LIVE_DATA_LIMIT', '完整实时快照超过模型输入安全上限，未截断后评分');
    return view;
  };
  if (toolName === 'list-nutrition-foods') {
    const foods = liveNutrition(result);
    return checkedView({
      source: 'live',
      complete: true,
      totalRows: foods.length,
      idKind: 'snapshot-local-row-id; not an official product code',
      energyBasis: 'unspecified',
      columns: ['id', 'name', 'energyKcal'],
      rows: foods.map((f) => [f.id, f.name, f.energyKcal]),
    });
  }
  if (toolName !== 'campaign-calendar')
    throw new ArenaError('LIVE_DATA_UNSUPPORTED', '本任务没有该工具的实时数据适配器');
  const entries = liveCalendar(result);
  return checkedView({
    source: 'live',
    complete: true,
    totalRows: entries.length,
    idKind: 'snapshot-local-entry-id; not an official activity code',
    campaignValidity: 'unknown',
    columns: ['id', 'name', 'calendarDate'],
    rows: entries.map((e) => [e.id, e.name, e.calendarDate]),
  });
}
