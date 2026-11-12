# Use a dedicated public order projection

The public order board consumes a dedicated projection instead of the complete order contract. The projection exposes the guest name, shared order status, compact product summary, visibility deadline, and existing order UUID as a non-displayed rendering key; it excludes notes, customizations, session identifiers, and unrelated timestamps. Possessing the order UUID grants no access, because complete reads and mutations remain host-protected.
