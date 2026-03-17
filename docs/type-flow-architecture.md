# Type Flow Architecture: Drizzle → Valibot → TypeScript

## Overview

This document shows how types flow through our architecture, from database schema definition through validation to TypeScript types.

```
┌─────────────────┐      ┌──────────────┐      ┌──────────────┐
│  Drizzle Schema │ ───► │   Valibot    │ ───► │  TypeScript  │
│   (Database)    │      │ (Validation) │      │    (Types)   │
└─────────────────┘      └──────────────┘      └──────────────┘
```

## 1. Drizzle Schema Definition (Source of Truth)

```typescript
// In schema.ts - This defines the database structure
export const images = sqliteTable('images', {
	id: text('id').primaryKey(),
	sessionId: text('session_id'),
	participantId: text('participant_id'),
	personaId: text('persona_id').notNull(),
	personaTitle: text('persona_title'),
	tableId: text('table_id'),
	imageUrl: text('image_url'),
	prompt: text('prompt').notNull(),
	provider: text('provider').default('placeholder').notNull(),
	status: text('status').default('generating').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
});
```

## 2. TypeScript Types (Auto-Generated from Drizzle)

```typescript
// Drizzle automatically infers these types from the schema
export type Image = typeof images.$inferSelect;
// Results in:
type Image = {
	id: string;
	sessionId: string | null;
	participantId: string | null;
	personaId: string;
	personaTitle: string | null;
	tableId: string | null;
	imageUrl: string | null;
	prompt: string;
	provider: string;
	status: string;
	createdAt: number; // ms timestamp
	updatedAt: number | null; // ms timestamp
};

export type NewImage = typeof images.$inferInsert;
// Results in:
type NewImage = {
	id: string;
	sessionId?: string | null;
	participantId?: string | null;
	personaId: string;
	personaTitle?: string | null;
	tableId?: string | null;
	imageUrl?: string | null;
	prompt: string;
	provider?: string; // Has default value
	status?: string; // Has default value
	createdAt: Date;
	updatedAt?: Date | null;
};
```

## 3. Valibot Validation Schemas (Auto-Generated + Custom Rules)

```typescript
// Base schemas generated from Drizzle
export const insertImageSchema = createInsertSchema(images, {
	// Custom refinements overlay on Drizzle schema
	prompt: v.pipe(
		promptPipe, // Custom validation: min 10 chars
		v.maxLength(1000, 'Prompt must be less than 1000 characters')
	),
	personaId: personaIdPipe, // Validates against enum
	tableId: optionalTableIdPipe, // Validates 1-10 range
	imageUrl: optionalUrlPipe // Validates URL format
});

export const selectImageSchema = createSelectSchema(images);
```

## 4. Validation Pipes (Reusable Validation Logic)

```typescript
// In validation/common.ts
export const personaIdPipe = v.pipe(
	v.string('PersonaId must be a string'),
	v.regex(/^(baby-boomer|gen-x|millennial|gen-z|gen-alpha)$/, 'Invalid persona ID')
);

export const tableIdPipe = v.pipe(
	v.string('TableId must be a string'),
	v.regex(/^([1-9]|10)$/, 'TableId must be between 1-10')
);

export const imageStatusPipe = v.pipe(
	v.string('Status must be a string'),
	v.regex(/^(generating|active|uploaded|locked|failed)$/, 'Invalid status')
);
```

## 5. Query Builders (Type-Safe Database Operations)

```typescript
// In queries.ts - All queries return proper Drizzle types
export const ImageQueries = {
	byId: (db: DatabaseConnection, id: string) =>
		db.select().from(images).where(eq(images.id, id)).limit(1),
	// Returns: Promise<Image[]>

	byStatus: (db: DatabaseConnection, status: string) =>
		db.select().from(images).where(eq(images.status, status)),
	// Returns: Promise<Image[]>

	countByTable: (db: DatabaseConnection) =>
		db
			.select({
				tableId: images.tableId,
				count: sql<number>`count(*)`
			})
			.from(images)
			.where(isNotNull(images.tableId))
			.groupBy(images.tableId)
	// Returns: Promise<{ tableId: string; count: number }[]>
};
```

## 6. Remote Functions (End-to-End Type Safety)

```typescript
// In gallery.remote.ts
export const listImagesSince = query(ListImagesSinceSchema, async (params) => {
	const { since, limit = 50, admin = false, tableId } = params;
	const db = getDatabase();
	const conditions = [gt(images.updatedAt, since)];
	if (tableId) conditions.push(eq(images.tableId, tableId));
	if (!admin) conditions.push(gt(images.createdAt, Date.now() - 86400000));
	const result = await db
		.select()
		.from(images)
		.where(and(...conditions))
		.orderBy(desc(images.updatedAt))
		.limit(limit);
	return serializeImages(result);
});
```

## 7. Complete Flow Example (Store‑Driven)

```typescript
// Client: First gallery sync then incremental
await syncWorkspaces({ limit: 100, reset: true });
// Later…
await syncWorkspaces({ limit: 100 }); // incremental by timestamp
```

## Benefits of This Architecture

1. **Single Source of Truth**: Drizzle schema defines the database structure
2. **Automatic Type Generation**: TypeScript types are inferred, not manually written
3. **Runtime Validation**: Valibot ensures data correctness at runtime
4. **Reusable Validation**: Pipes can be shared across schemas
5. **Type Safety**: Full type safety from database to API response
6. **Performance**: Optimized queries with proper indexing
7. **Maintainability**: Change schema in one place, types update everywhere

## Key Files in the Flow

- `/src/lib/server/db/schema.ts` - Drizzle table definitions & type exports
- `/src/lib/server/db/queries.ts` - Type-safe query builders
- `/src/lib/validation/common.ts` - Reusable Valibot validation pipes
- `/src/routes/gallery/gallery.remote.ts` - Remote functions using all layers
