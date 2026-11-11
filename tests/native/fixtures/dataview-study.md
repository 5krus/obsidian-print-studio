---
name: Sample Salve
version: 2
recipe:
  shelf_life: 6 months
tags: [alpha, beta]
active: false
amount: 0
made: 2026-11-01
---
# `=this.name` · v`=this.version`

Complex expression: `=this.version + 1`

Shelf life: `=this.recipe.shelf_life`

Tags: `=this.tags`

Active: `=this.active`

Amount: `=this.amount`

Made: `=dateformat(this.made, "yyyy-MM-dd")`

Ordinary code: `const value = 2`

```text
=this.name
```
