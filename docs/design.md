# Interface direction

V0 uses a calm industrial workspace: warm white and graphite surfaces, a restrained orange signal color, Inter for interface text and IBM Plex Mono for small operational labels and counts. Fonts are bundled locally. Lucide provides consistent line icons. A decorative technical line drawing and an original generated industrial image identify the manufacturing context without implying a real part specification or operational data. The image and full generation prompt are documented in [asset provenance](assets.md).

The visual references are [Linear's interface hierarchy](https://linear.app/now/behind-the-latest-design-refresh), [Attio's record-focused product](https://attio.com/), and the engineering context of [Instrumental](https://instrumental.com/product/). These inform hierarchy and density; source assets, business claims and layouts are not copied.

Navigation is quiet, with one current section, clear breadcrumbs and a compact staff identity. Primary actions have consistent placement. A shared spacing/type/color system in `src/app/globals.css` serves list, detail, form and authentication screens. Empty states guide the next real action without fake charts or demonstration business records. Status indicators use text as well as color. Supplier qualification and RFQ approval remain distinct.

The overview uses actual database counts and the most recent four records. Zero is displayed honestly. The technical illustration is decorative and hidden from assistive technology. Mobile navigation becomes a compact tab strip; forms become one column; tables scroll within their container. Reduced-motion preferences disable transitions.

Before future visual changes, inspect desktop and mobile screenshots and preserve this direction unless a new design has been explicitly chosen. Use existing tokens and shared components before adding one-off styles. Do not use a motion or control correction as a reason to redesign the interface.

## Motion and interaction

The cinematic sign-in scene uses a nine-second camera reveal, masked headline entrance and staggered copy. The workspace uses shorter page entrances, drawn engineering linework, staggered metric entrances, hover transitions and a modal reveal. Motion never gates a business decision or changes record state. Native keyboard navigation, a Cmd/Ctrl+K quick-find dialog, accessible status/error feedback, loading skeletons and record-reference copying support the daily workflow.

System reduced-motion settings disable animations. A visible Motion control also persists a minimal-motion preference locally; this stores a visual preference, not any business record. Keep large animation in the entry/overview scene, and small animation around working controls. Avoid making record text move while staff are reading or reviewing it.
