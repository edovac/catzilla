-- Audit history: every change to donations, expenses, categories and cats is
-- recorded in audit_log by these triggers, so no code path can skip it.
-- The acting user comes from the row's created_by / updated_by columns.
--
-- If you add, remove or rename a column in one of these tables, write a new
-- migration that drops and recreates that table's triggers.

-- donations
CREATE TRIGGER `donations_require_updated_at` BEFORE UPDATE ON `donations`
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  SELECT RAISE(ABORT, 'donations: updates must set updated_at and updated_by');
END;
--> statement-breakpoint
CREATE TRIGGER `donations_audit_insert` AFTER INSERT ON `donations`
BEGIN
  INSERT INTO audit_log (entity_type, entity_id, action, user_id, at, old_values, new_values)
  VALUES ('donation', NEW.id, 'create', NEW.created_by, NEW.created_at, NULL,
    json_object('date', NEW.date, 'amountCents', NEW.amount_cents, 'donor', NEW.donor, 'paymentMethod', NEW.payment_method, 'notes', NEW.notes, 'deletedAt', NEW.deleted_at));
END;
--> statement-breakpoint
CREATE TRIGGER `donations_audit_update` AFTER UPDATE ON `donations`
WHEN json_object('date', OLD.date, 'amountCents', OLD.amount_cents, 'donor', OLD.donor, 'paymentMethod', OLD.payment_method, 'notes', OLD.notes, 'deletedAt', OLD.deleted_at) IS NOT json_object('date', NEW.date, 'amountCents', NEW.amount_cents, 'donor', NEW.donor, 'paymentMethod', NEW.payment_method, 'notes', NEW.notes, 'deletedAt', NEW.deleted_at)
BEGIN
  INSERT INTO audit_log (entity_type, entity_id, action, user_id, at, old_values, new_values)
  VALUES ('donation', NEW.id,
    CASE
      WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN 'delete'
      WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN 'restore'
      ELSE 'update'
    END,
    NEW.updated_by, NEW.updated_at,
    json_object('date', OLD.date, 'amountCents', OLD.amount_cents, 'donor', OLD.donor, 'paymentMethod', OLD.payment_method, 'notes', OLD.notes, 'deletedAt', OLD.deleted_at),
    json_object('date', NEW.date, 'amountCents', NEW.amount_cents, 'donor', NEW.donor, 'paymentMethod', NEW.payment_method, 'notes', NEW.notes, 'deletedAt', NEW.deleted_at));
END;
--> statement-breakpoint
-- expenses
CREATE TRIGGER `expenses_require_updated_at` BEFORE UPDATE ON `expenses`
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  SELECT RAISE(ABORT, 'expenses: updates must set updated_at and updated_by');
END;
--> statement-breakpoint
CREATE TRIGGER `expenses_audit_insert` AFTER INSERT ON `expenses`
BEGIN
  INSERT INTO audit_log (entity_type, entity_id, action, user_id, at, old_values, new_values)
  VALUES ('expense', NEW.id, 'create', NEW.created_by, NEW.created_at, NULL,
    json_object('date', NEW.date, 'amountCents', NEW.amount_cents, 'categoryId', NEW.category_id, 'description', NEW.description, 'catId', NEW.cat_id, 'supplier', NEW.supplier, 'notes', NEW.notes, 'deletedAt', NEW.deleted_at));
END;
--> statement-breakpoint
CREATE TRIGGER `expenses_audit_update` AFTER UPDATE ON `expenses`
WHEN json_object('date', OLD.date, 'amountCents', OLD.amount_cents, 'categoryId', OLD.category_id, 'description', OLD.description, 'catId', OLD.cat_id, 'supplier', OLD.supplier, 'notes', OLD.notes, 'deletedAt', OLD.deleted_at) IS NOT json_object('date', NEW.date, 'amountCents', NEW.amount_cents, 'categoryId', NEW.category_id, 'description', NEW.description, 'catId', NEW.cat_id, 'supplier', NEW.supplier, 'notes', NEW.notes, 'deletedAt', NEW.deleted_at)
BEGIN
  INSERT INTO audit_log (entity_type, entity_id, action, user_id, at, old_values, new_values)
  VALUES ('expense', NEW.id,
    CASE
      WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN 'delete'
      WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN 'restore'
      ELSE 'update'
    END,
    NEW.updated_by, NEW.updated_at,
    json_object('date', OLD.date, 'amountCents', OLD.amount_cents, 'categoryId', OLD.category_id, 'description', OLD.description, 'catId', OLD.cat_id, 'supplier', OLD.supplier, 'notes', OLD.notes, 'deletedAt', OLD.deleted_at),
    json_object('date', NEW.date, 'amountCents', NEW.amount_cents, 'categoryId', NEW.category_id, 'description', NEW.description, 'catId', NEW.cat_id, 'supplier', NEW.supplier, 'notes', NEW.notes, 'deletedAt', NEW.deleted_at));
END;
--> statement-breakpoint
-- categories
CREATE TRIGGER `categories_require_updated_at` BEFORE UPDATE ON `categories`
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  SELECT RAISE(ABORT, 'categories: updates must set updated_at and updated_by');
END;
--> statement-breakpoint
CREATE TRIGGER `categories_audit_insert` AFTER INSERT ON `categories`
BEGIN
  INSERT INTO audit_log (entity_type, entity_id, action, user_id, at, old_values, new_values)
  VALUES ('category', NEW.id, 'create', NEW.created_by, NEW.created_at, NULL,
    json_object('name', NEW.name, 'archivedAt', NEW.archived_at));
END;
--> statement-breakpoint
CREATE TRIGGER `categories_audit_update` AFTER UPDATE ON `categories`
WHEN json_object('name', OLD.name, 'archivedAt', OLD.archived_at) IS NOT json_object('name', NEW.name, 'archivedAt', NEW.archived_at)
BEGIN
  INSERT INTO audit_log (entity_type, entity_id, action, user_id, at, old_values, new_values)
  VALUES ('category', NEW.id,
    CASE
      WHEN OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN 'archive'
      WHEN OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL THEN 'restore'
      ELSE 'update'
    END,
    NEW.updated_by, NEW.updated_at,
    json_object('name', OLD.name, 'archivedAt', OLD.archived_at),
    json_object('name', NEW.name, 'archivedAt', NEW.archived_at));
END;
--> statement-breakpoint
-- cats
CREATE TRIGGER `cats_require_updated_at` BEFORE UPDATE ON `cats`
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  SELECT RAISE(ABORT, 'cats: updates must set updated_at and updated_by');
END;
--> statement-breakpoint
CREATE TRIGGER `cats_audit_insert` AFTER INSERT ON `cats`
BEGIN
  INSERT INTO audit_log (entity_type, entity_id, action, user_id, at, old_values, new_values)
  VALUES ('cat', NEW.id, 'create', NEW.created_by, NEW.created_at, NULL,
    json_object('name', NEW.name, 'notes', NEW.notes, 'archivedAt', NEW.archived_at));
END;
--> statement-breakpoint
CREATE TRIGGER `cats_audit_update` AFTER UPDATE ON `cats`
WHEN json_object('name', OLD.name, 'notes', OLD.notes, 'archivedAt', OLD.archived_at) IS NOT json_object('name', NEW.name, 'notes', NEW.notes, 'archivedAt', NEW.archived_at)
BEGIN
  INSERT INTO audit_log (entity_type, entity_id, action, user_id, at, old_values, new_values)
  VALUES ('cat', NEW.id,
    CASE
      WHEN OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN 'archive'
      WHEN OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL THEN 'restore'
      ELSE 'update'
    END,
    NEW.updated_by, NEW.updated_at,
    json_object('name', OLD.name, 'notes', OLD.notes, 'archivedAt', OLD.archived_at),
    json_object('name', NEW.name, 'notes', NEW.notes, 'archivedAt', NEW.archived_at));
END;
