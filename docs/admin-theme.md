# Shared admin theme

Subscribers is the visual reference for future admin work. Start new pages from admin-page-template.html. The shared stylesheet is admin/css/admin.css; page-specific CSS should add layout only.

| Element | Standard |
| --- | --- |
| Page | Warm light background, existing navy sidebar, shared header and title |
| Card | White surface, dark slate text, subtle border, rounded corners |
| Tabs | `.page-tabs` containing `.page-tab`; white inactive, navy selected with white text, rounded corners |
| Selection | Keep `.is-active`, `aria-selected`, panel visibility, and tab focus in sync |
| Fields | `.form-group` with visible labels; light field backgrounds and dark text, including dropdown options |
| Buttons | Shared primary, secondary, and danger classes |
| Keyboard | Visible focus, arrow/Home/End navigation for tabs |

Reuse shared components. Do not derive text and background from unrelated saved theme variables, or recreate tab colors in individual pages. Avoid bare browser-default controls or custom dark cards in the light workspace. Status colors are for statuses, not new page themes.

Keep unsaved tab content mounted when switching. Use the existing admin authentication and storage helpers. A hidden tab or sign-in redirect does not replace authentication on the server. Do not embed private content into static templates.

Bump stylesheet query versions when changing shared CSS. Check selected/unselected/hover/focus states, narrow screens, and readable text on cards and fields. Existing public website design is separate from the admin theme.
