# Glossary Map

## Contexts

- [Workspace](./docs/GLOSSARY.md): how the monorepo classifies its projects and the tests each kind carries.
- [InvestLab](./packages/investlab-portfolio/src/domain/GLOSSARY.md): personal investment tool split into the Catalog module (the Instrument catalog, `packages/investlab-catalog`), Portfolio (what the user holds and its target allocation) and Roger (follows a trader's stock calls through an entry lifecycle); Portfolio and Roger depend on Catalog.
- QUP: not yet documented (lives under `packages/qup-domain`)

## Relationships

- InvestLab and QUP share nothing at the domain level; both follow the same domain/data package pattern.
