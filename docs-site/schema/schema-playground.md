# Schema Playground

> 📋 **Coming Soon** — An interactive schema editor and live preview will be available as a web-based playground.
>
> In the meantime, you can:
> - Use the **[Getting Started](/getting-started)** guide to create your first schema
> - Explore the **[Storybook](https://github.com/byteforce-cn/workbook)** examples in the repository
> - Reference the **[Schema Reference](/schema/schema-reference)** for all schema definitions

## Quick Schema Template

Start with this minimal schema and expand:

```json
{
  "schemaVersion": "4.1.1",
  "views": [
    {
      "type": "form",
      "id": "my-form",
      "fields": [
        {
          "name": "name",
          "type": "string",
          "label": "Name",
          "required": true
        },
        {
          "name": "email",
          "type": "string",
          "label": "Email",
          "validations": [
            { "type": "required", "message": "Email is required" },
            { "type": "pattern", "params": { "pattern": "^[^@]+@[^@]+$" }, "message": "Invalid email" }
          ]
        },
        {
          "name": "department",
          "type": "select",
          "label": "Department",
          "options": [
            { "value": "eng", "label": "Engineering" },
            { "value": "design", "label": "Design" },
            { "value": "product", "label": "Product" }
          ]
        }
      ],
      "layout": [
        { "type": "field", "name": "name" },
        { "type": "field", "name": "email" },
        { "type": "field", "name": "department" }
      ]
    }
  ]
}
```

## Validation Hints

When building schemas, keep these in mind:

1. **Field names must be unique** within a view
2. **Layout must reference existing field names**
3. **Conditions referencing fields must use the data path** (e.g., `user.name`, not just `name`)
4. **Option sources with `dependsOn`** must reference field names, not data paths
5. **Hook types `api`** require a valid `url` field
6. **Page blocks** must be in order they should render
7. **Sheet columns** must have unique `name` values
