# Description 

CatZilla is a simple accounting app for a group of volunteers that shelters cats.

The shelter spends money for:
* veterinary treatments
* bills 
* food and goods for the animals

The shelter receives money through donations.

# Users and access

* The app is used by a small group of trusted volunteers (2–5 people).
* Every user must log in. Login protects the data, identifies the user and allows auditing of operations.
* All users can view, insert, edit and delete data.
* One or more users are administrators: in addition, they manage the users of the app.
* Every operation is audited: each change to a donation, expense, category or cat is recorded in a history with who made it, when, and the values before and after.
* The app is a mobile-first web app, usable from phone and desktop.
* The UI is in Italian. The only currency is EUR.

# Use cases

## Log in
As a user I want to log in with my personal credentials, so that only authorized volunteers can access the data and every operation is attributed to me.

## Manage users
As an administrator I want to add, disable and re-enable users, and grant or revoke the administrator role.
* Users are never deleted, so that the history keeps pointing to them: they are disabled.
* A disabled user can no longer log in.
* There is always at least one enabled administrator.

## Insert a donation
As a user I want to register a donation.

Fields:
* date (required)
* amount in EUR (required, > 0)
* donor name (optional, free text; empty means anonymous)
* payment method (required): cash, bank transfer, PayPal, other
* notes (optional)

Donors are not tracked as entities: there is no donor registry, no per-donor history and no receipts.

## Register an expense
As a user I want to register an expense.

Fields:
* date (required)
* amount in EUR (required, > 0)
* category (required)
* description (required)
* cat (optional): the cat the expense refers to, e.g. a veterinary treatment
* supplier / payee (optional)
* notes (optional)

Expenses are always paid from the shared fund (no reimbursements to volunteers). Recurring expenses are entered manually. Receipt/invoice attachments are not supported.

## Manage categories
As a user I want to add, rename and archive expense categories.
* Categories are a flat list (no sub-categories).
* Initial categories: veterinary treatments, bills, food and goods.
* Categories are never deleted: a category can be archived.
* An archived category is not offered when inserting a new expense, but remains visible on existing expenses and in reports.
* An archived category can be restored.

## Manage cats
As a user I want to keep a minimal list of cats, so that I can link expenses to a specific cat.
* A cat has a name and optional notes.
* Cats are never deleted: a cat can be archived (e.g. adopted or deceased).
* An archived cat is not offered when inserting a new expense, but remains visible on existing expenses and in the per-cat summary.
* An archived cat can be restored.

## Edit or delete an entry
As a user I want to correct or delete a donation or an expense I or someone else inserted.
* Every edit is recorded in the entry's history.
* Deleting an entry does not remove it: it is marked as deleted, excluded from balance and reports, and kept in the history.
* A deleted entry can be restored.

## See the history of an entry
As a user I want to see the full history of a donation, expense, category or cat: who created it, every change (who, when, old and new values), archival, deletion and restoration.

## See total funds available
As a user I want to see the current balance of the shelter.
* There is a single pool of money.
* Balance = opening balance + all donations − all expenses.
* The opening balance is entered once, when the app starts being used.

## Expense report by category
As a user I want to see how much was spent per category over a period.
* Period: a month, a year, or a custom date range.
* The report shows totals per category, as a table and as a chart (pie or bar).
* The report also shows a summary of donations vs. expenses for the period.
* No export is required.

## Expense summary by cat
As a user I want to see the expenses related to a specific cat.
* Filterable by period (month, year, custom range; default: all time).
* Shows the list of expenses and the total, broken down by category.

# Out of scope
* Multiple accounts or cash boxes
* Donor management, donation receipts, in-kind donations
* Reimbursements to volunteers
* Recurring expenses
* Attachments (receipts, invoices)
* Report export
* Import of existing data
* Adoption management, full cat registry (medical records, photos…), volunteer scheduling

# Non functional requirements

## Cost of ownership
The application must cost as little as possible. Ideally it would run on completely free hosting and database services.

## Data retention and backup
Data is kept indefinitely. A periodic backup of the data must be possible.

## Security
Access requires authentication. Data must not be publicly accessible.
