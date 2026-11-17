# BAROLOGY Quotation Editor

This repository contains the BAROLOGY quotation editor.

## Deploy with GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html` to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then save.
6. Open the published GitHub Pages URL after deployment finishes.

## Notes

- The editor runs in the browser; no build step or server is required.
- Use **Print / Save PDF** to export the quotation.
- VAT defaults to 11%. Set it to `0` to print the Grand Total without the “INCLUDING VAT” wording.
- Discount rows are intended to be hidden in the PDF when the discount is zero.
- Editor data is saved in the current browser. Use Export Data to keep a backup before changing devices or browsers.
