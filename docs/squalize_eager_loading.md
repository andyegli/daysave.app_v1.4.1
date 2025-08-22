## Sequelize eager loading

### What it means
- **Eager loading**: Fetch related rows in the same query using `include` so you avoid N+1 queries.
- **Association modeling**: Declaring relationships (e.g., `hasMany`, `belongsTo`, `belongsToMany`) in `models/index.js`, which powers `include`.

### Association setup (example)
```javascript
// models/index.js (examples)
User.hasMany(Content, { foreignKey: 'userId' });
Content.belongsTo(User, { foreignKey: 'userId' });

Content.hasMany(File, { foreignKey: 'contentId' });
File.belongsTo(Content, { foreignKey: 'contentId' });

// Many-to-many (example)
Tag.belongsToMany(Content, { through: 'content_tags', foreignKey: 'tagId' });
Content.belongsToMany(Tag, { through: 'content_tags', foreignKey: 'contentId' });
```

### Basic eager load
```javascript
const items = await Content.findAll({
  where: { status: 'published' },
  include: [
    { model: User, attributes: ['id', 'username'] },
    { model: File, attributes: ['id', 'type', 'path'], required: false }, // LEFT JOIN
  ],
  order: [['createdAt', 'DESC']],
  limit: 20,
});
```

### Filtering by associated model
```javascript
// Only contents that have at least one image file
const withImages = await Content.findAll({
  include: [{ model: File, where: { type: 'image' }, required: true }], // INNER JOIN
});
```

### Nested includes
```javascript
const results = await Content.findAll({
  include: [
    { model: User, attributes: ['id', 'username'] },
    { model: File, include: [{ model: Thumbnail, attributes: ['url'] }] },
  ],
});
```

### Many-to-many with `through`
```javascript
const items = await Content.findAll({
  include: [{
    model: Tag,
    through: { attributes: [] }, // omit join table fields
    where: { name: 'featured' },
    required: true,
  }],
});
```

### Composable queries (scopes + includes)
```javascript
// models/content.js
Content.addScope('published', { where: { status: 'published' } });

// usage
const rows = await Content.scope('published').findAll({
  include: [{ model: User, attributes: ['id', 'username'] }],
  order: [['createdAt', 'DESC']],
});
```

### Performance tips
- **Avoid N+1**: Prefer `include` over per-row queries.
- **`required`**: `true` = INNER JOIN (filters parent by child); `false` = LEFT JOIN.
- **Pagination with hasMany**: Use `distinct: true` to fix inflated counts, or `separate: true` on large child sets.
```javascript
const rows = await Content.findAndCountAll({
  where: { status: 'published' },
  include: [{ model: File, required: false }],
  distinct: true, // ensures correct count with joins
  limit: 20,
  offset: 0,
});

// Or for heavy child associations
const rows2 = await Content.findAll({
  include: [{ model: File, separate: true, limit: 5, order: [['createdAt', 'DESC']] }],
  limit: 20,
});
```
- **Ordering across associations**: Use fully qualified columns and indexes where possible.
- **Subquery control**: For some dialects, `subQuery: false` can help with `limit` + `include` edge cases.

### Common pitfalls
- Expecting automatic cancellation or lazy fetching—`include` executes joins immediately.
- Forgetting `distinct` with `findAndCountAll` when using `include` leads to wrong totals.
- Pulling huge child collections inline; prefer `separate: true` or fetch-on-demand.

### Takeaway
- Define associations centrally in `models/index.js` and lean on `include` to build expressive, reusable, and efficient queries that compose filters, sorts, and nested relationships without N+1 overhead.

