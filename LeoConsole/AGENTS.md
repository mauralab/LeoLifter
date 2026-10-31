# Console UI conventions

- Actions use number keys 1–9 and visible labels such as `1. New`, `2. Cancel`. Use non-focusable action labels, not arrow/Enter-activated buttons. Reserve 9 for Back (Exit at Home).
- Arrows navigate table rows, pages and inputs, never actions. Enter on a table row may open its edit screen.
- Show `>` beside the selected input and `-` beside the others. Register text inputs using EditableTextInput and ScreenBase.RegisterInput.
- Inputs are read-only until Enter starts editing. While editing, all action shortcuts are disabled and digits are text. Enter keeps the field draft; Esc restores its previous value and exits editing. Database writes require the numbered Save/Create action afterward.
- Keep footer hints synchronized with edit mode. Do not introduce function-key or Alt+number action aliases.
- Paginate every table; truncate long display values without changing stored values.

- Home separates Constructors and SQL tables with Left/Right tabs. Constructor screens use managers and account drafts; SQL screens edit individual mapped rows without DDL.
- User workspaces combine General/Profile/Settings in Details and expose owned Sessions/Weight as tabs. Use Up from the first input/row to focus the tab strip; Left/Right switches tabs there, pages a focused table, or cycles a selected option.
- Persist User/Profile/Settings together using SaveAccountAsync; do not chain separately committed writes for the combined form. Preserve draft fields when switching tabs.
