# Implementation Plan: Oracle Executor Decoupling

## 1. Technical Strategy

We will adopt a **Command + Event + DI** hybrid architecture.

### Command Dispatcher

The `OracleActionExecutor` will act as a Registry/Composer. It will map `OracleIntentType` to specific `OracleCommandExecutor` implementations.

### Event-Driven Side Effects

Executors will no longer call services like `logActivity` or `uiStore.notify`. Instead, they will emit typed events via the `AppEventBus`.

- **Example**: `ORACLE:ENTITY_CREATED`, `ORACLE:COMMAND_FAILED`.

### Dependency Injection

All executors will use constructor-based DI with sensible defaults. This allows the Engine to remain independent of the Web layer during testing.

## 2. Infrastructure Changes

### `OracleCommandExecutor` Interface

```typescript
export interface OracleCommandExecutor {
  execute(intent: OracleIntent, context: OracleExecutionContext): Promise<void>;
}
```

### Event Registry

Update `packages/oracle-engine/src/events.ts` to include:

- `ORACLE:COMMAND_STARTED`
- `ORACLE:COMMAND_COMPLETED`
- `ORACLE:COMMAND_FAILED`
- `ORACLE:ENTITY_DISCOVERED`

## 3. Phased Extraction

### Phase 1: Simple Commands

Extract `/roll`, `/help`, `/clear` into:

- `DiceExecutor`
- `MetaExecutor`

### Phase 2: Mutation Commands

Extract `/create`, `/connect`, `/merge`, `/plot` into:

- `CreateExecutor`
- `ConnectExecutor`
- `MergeExecutor`

### Phase 3: AI & Orchestration

Extract `executeChat` and `executeRegenerate` into:

- `ChatExecutor`
- `RegenerateExecutor`

## 4. Verification vs. Constitution

- **Svelte 5 Runes**: Use `$state.snapshot` when passing proxy data to executors.
- **Dependency Injection**: Every executor MUST be instantiated with its dependencies, no global singletons in the engines.
- **Testing**: Every extracted executor must have a dedicated `.test.ts` file in the engine package.
