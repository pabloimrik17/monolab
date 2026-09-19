# Qup

Qup coordinates drink orders between a host and guests during a shared session.

## Language

**Session**:
A hosted gathering during which guests can place orders using a shared session code.
_Avoid_: Event, room

**Host**:
The person who manages the session and prepares and serves its orders.
_Avoid_: Admin, operator

**Guest**:
An end user who joins a session and places orders.
_Avoid_: User, customer

**Order**:
A group of one or more menu items requested together by a guest. The group moves through one shared status as a unit.
_Avoid_: Item, drink

**Order item**:
A menu item and quantity within an order. It has no status or lifecycle independent from its order.
_Avoid_: Order

**Public order board**:
A read-only view of the session's orders for guests who know the session code, opened without the host PIN. Each order is identified by guest name and exposes its status and a compact product summary, but not notes or customizations.
_Avoid_: Admin queue, general status

**Completed order**:
An order that the host has both prepared and served. Its status is `DONE`; preparation and service are not tracked separately, and it remains on the public order board only briefly.
_Avoid_: Ready order, collected order
