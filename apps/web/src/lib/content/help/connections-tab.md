---
id: connections-tab
title: Connections Tab
description: See what an entity is directly linked to, with that entity in the middle and its relationships drawn around it.
icon: icon-[lucide--waypoints]
rank: 9
tags: [connections, relationships, graph, entities]
---

# Connections Tab

Open the **Connections** tab on any entity to answer one question: what is this directly linked to?

## Reading the view

The entity you are looking at sits in the middle, larger than the rest. Everything drawn around it is one step away:

- **Links you made from this entity** — the arrow on the line points away from the middle.
- **Links other entities made to this one** — the arrow points back toward the middle.
- **Entities filed under this one** in the hierarchy, shown as "child".

The words on each line are the relationship: whatever label you wrote, or the connection type if you did not write one. Each surrounding entity keeps its own type colour and icon, the same ones the graph and the entity list use.

## Opening a connection

Click any surrounding entity to open it, exactly as you would from the list or the graph. Its own Connections tab then shows what _it_ is linked to, so you can walk a chain one step at a time.

## What it deliberately does not do

This is not a small copy of the world graph. It stops at one step: it never draws the connections of your connections, and it has no filters or layout controls. For the wider picture, or for anything you want to rearrange, use the graph.

If an entity has more than twenty direct connections, the view shows twenty of them and tells you how many are left over — the graph is the better tool at that point.

## Where the links come from

Nothing here is stored twice. The view is built from the same connections you manage in the **Status** tab, so adding, editing, or removing a connection there changes what you see here immediately.
