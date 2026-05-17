# Feature Specification: Oracle Executor Decoupling

**Feature Branch**: `refactor/oracle-executor-monolith`  
**Created**: 2026-05-17  
**Status**: In Progress  
**Input**: Analysis of `packages/oracle-engine/src/oracle-executor.ts` (1,135 lines)

## 1. Problem Statement

The `OracleActionExecutor` is a critical God Object that violates the Single Responsibility Principle and the Dependency Inversion Principle. It handles command routing, complex business logic, AI orchestration, and direct side-effect management. This makes the Oracle engine difficult to test, maintain, and extend.

## 2. Goals

- **Modularize**: Extract command-specific logic into isolated handlers.
- **Decouple**: Transition to an Event-Driven architecture using `@codex/events`.
- **Inversion of Control**: Use Constructor-based Dependency Injection for all services.
- **Maintainability**: Reduce the main monolith to a thin composer (< 200 lines).

## 3. Core Requirements

- **CR-001**: Implementation of a modular Command Pattern for all slash commands.
- **CR-002**: Elimination of "Callback Bloat" in `OracleExecutionContext`.
- **CR-003**: Domain-specific event emission for all major Oracle actions.
- **CR-004**: 100% unit test coverage for new specialized executors.

## 4. Permission & Security (Constitution Alignment)

- **SEC-001**: Ensure guest restrictions (no lore, no recon) are preserved across all extracted executors.
- **SEC-002**: Maintain existing visibility (Fog of War) checks during execution.
