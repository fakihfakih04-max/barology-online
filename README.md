# BAROLOGY Quotation Management V6

## Approval workflow
- New quotations are Pending.
- Approve moves the quotation to Approved Quotations.
- Approved quotations can be moved back to Pending.

## Email reminders
- Approved quotations with an event date get reminder dates 7 days and 3 days before the event.
- Prepare Email opens the user's email application with a prefilled message addressed to the saved customer email.
- Mark Sent records that the reminder was sent.

**Important:** GitHub Pages is static hosting and cannot send scheduled emails automatically. These are prepared/manual email reminders. Fully automatic sending requires a backend and an email delivery provider.

## Publish
Replace `index.html` in the GitHub repository root with this version, then refresh the site.
