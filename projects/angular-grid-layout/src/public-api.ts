/*
 * Public API Surface of grid
 */
export { ktdGridCompact, ktdGridSortLayoutItems, ktdTrackById } from './lib/utils/grid.utils';
export { KtdClientRect } from './lib/utils/client-rect';

// Standalone public API
export * from './lib/directives/drag-handle';
export * from './lib/directives/resize-handle';
export * from './lib/directives/placeholder';
export * from './lib/grid-item/grid-item.component';
export * from './lib/grid.definitions';
export * from './lib/grid.component';

// Legacy compatibility wrapper for NgModule-based consumers
export * from './lib/grid.module';

