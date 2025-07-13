// src/components/LazyComponents.js
import { lazy, Suspense } from 'react';

// Lazy load heavy components
export const LazyTeamManagement = lazy(() => import('./TeamManagement'));
export const LazyDraftBoard = lazy(() => import('./DraftBoard'));
export const LazyVirtualizedLeaderboard = lazy(() => import('./VirtualizedLeaderboard'));

// Loading component
const ComponentLoader = ({ children }) => (
  <Suspense fallback={
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '200px',
      color: '#ccc' 
    }}>
      <div>Loading component...</div>
    </div>
  }>
    {children}
  </Suspense>
);

export const TeamManagement = (props) => (
  <ComponentLoader>
    <LazyTeamManagement {...props} />
  </ComponentLoader>
);

export const DraftBoard = (props) => (
  <ComponentLoader>
    <LazyDraftBoard {...props} />
  </ComponentLoader>
);

export const VirtualizedLeaderboard = (props) => (
  <ComponentLoader>
    <LazyVirtualizedLeaderboard {...props} />
  </ComponentLoader>
);
