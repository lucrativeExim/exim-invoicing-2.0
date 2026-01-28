'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authService } from '@/services/authService';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Section IDs
const SECTION_IDS = {
  WELCOME: 'welcome',
  STATS: 'stats',
  JOB: 'job',
  USER_INFO: 'user-info',
};

const STAT_CARD_IDS = {
  TOTAL_INVOICES: 'total-invoices',
  PENDING: 'pending',
  PAID: 'paid',
  TOTAL_REVENUE: 'total-revenue',
};

const JOB_CARD_IDS = {
  ALL_JOBS: 'all-jobs',
  ADD_JOB: 'add-job',
};

export default function DashboardPage() {
  const [user, setUser] = useState(null);

  // Initialize section order from localStorage or default
  const [sectionOrder, setSectionOrder] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard-section-order');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return Object.values(SECTION_IDS);
        }
      }
    }
    return Object.values(SECTION_IDS);
  });

  // Initialize stats cards order from localStorage or default
  const [statsCardOrder, setStatsCardOrder] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard-stats-order');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return Object.values(STAT_CARD_IDS);
        }
      }
    }
    return Object.values(STAT_CARD_IDS);
  });

  // Initialize job cards order from localStorage or default
  const [jobCardOrder, setJobCardOrder] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard-job-cards-order');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return Object.values(JOB_CARD_IDS);
        }
      }
    }
    return Object.values(JOB_CARD_IDS);
  });

  // Save section order to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-section-order', JSON.stringify(sectionOrder));
    }
  }, [sectionOrder]);

  // Save stats card order to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-stats-order', JSON.stringify(statsCardOrder));
    }
  }, [statsCardOrder]);

  // Save job card order to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-job-cards-order', JSON.stringify(jobCardOrder));
    }
  }, [jobCardOrder]);

  useEffect(() => {
    // Get user from localStorage
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle main section drag end
  const handleSectionDragEnd = (event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Handle stats cards drag end
  const handleStatsCardDragEnd = (event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setStatsCardOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Handle job cards drag end
  const handleJobCardDragEnd = (event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setJobCardOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Sortable Section Component
  const SortableSection = ({ id, children }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`relative ${isDragging ? 'z-50' : ''}`}
      >
        <div
          {...listeners}
          {...attributes}
          className="absolute top-2 right-2 z-10 w-2 h-2 cursor-grab active:cursor-grabbing bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
          title="Drag to reorder"
        >
          <svg 
            width="5" 
            height="5" 
            viewBox="0 0 5 5" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M4 8H20M4 16H20" 
              stroke="#4B5563" 
              strokeWidth="0.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {children}
      </div>
    );
  };

  // Sortable Stats Card Component
  const SortableStatsCard = ({ id, children }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`cursor-grab active:cursor-grabbing ${isDragging ? 'z-50' : ''}`}
      >
        {children}
      </div>
    );
  };

  // Sortable Job Card Component
  const SortableJobCard = ({ id, children }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`cursor-grab active:cursor-grabbing ${isDragging ? 'z-50' : ''}`}
      >
        {children}
      </div>
    );
  };

  // Job cards data mapping
  const jobCardsData = {
    [JOB_CARD_IDS.ALL_JOBS]: {
      href: '/dashboard/job/job',
      title: 'All Jobs',
      description: 'View all active jobs',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      icon: (
        <svg className="w-5 h-5 text-blue-600 group-hover:text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    [JOB_CARD_IDS.ADD_JOB]: {
      href: '/dashboard/job/job/add',
      title: 'Add Job',
      description: 'Create a new job',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      icon: (
        <svg className="w-5 h-5 text-green-600 group-hover:text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
  };

  // Stats cards data mapping
  const statsCardsData = {
    [STAT_CARD_IDS.TOTAL_INVOICES]: {
      title: 'Total Invoices',
      value: '0',
      cardBg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      icon: (
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    [STAT_CARD_IDS.PENDING]: {
      title: 'Pending',
      value: '0',
      cardBg: 'bg-yellow-50',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      icon: (
        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    [STAT_CARD_IDS.PAID]: {
      title: 'Paid',
      value: '0',
      cardBg: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      icon: (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    [STAT_CARD_IDS.TOTAL_REVENUE]: {
      title: 'Total Revenue',
      value: '$0',
      cardBg: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      icon: (
        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  // Render section content based on ID
  const renderSection = (sectionId) => {
    switch (sectionId) {
      case SECTION_IDS.WELCOME:
        return (
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Welcome back, {user?.first_name || 'User'}!
              </h1>
              <p className="text-sm text-gray-600">Manage your invoices and track your business operations</p>
            </div>
          </div>
        );

      case SECTION_IDS.STATS:
        return (
          <div className="mb-4" onPointerDown={(e) => e.stopPropagation()}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleStatsCardDragEnd}
            >
              <SortableContext
                items={statsCardOrder}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {statsCardOrder.map((cardId) => {
                    const cardData = statsCardsData[cardId];
                    if (!cardData) return null;
                    
                    return (
                      <SortableStatsCard key={cardId} id={cardId}>
                        <div className={`${cardData.cardBg} rounded-lg shadow-sm border border-gray-200 p-4`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-gray-800 mb-1">{cardData.title}</p>
                              <p className="text-xl font-bold text-gray-900">{cardData.value}</p>
                            </div>
                            <div className={`w-10 h-10 ${cardData.iconBg} rounded-lg flex items-center justify-center`}>
                              {cardData.icon}
                            </div>
                          </div>
                        </div>
                      </SortableStatsCard>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        );

      case SECTION_IDS.JOB:
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4" onPointerDown={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Job</h2>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleJobCardDragEnd}
            >
              <SortableContext
                items={jobCardOrder}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {jobCardOrder.map((cardId) => {
                    const cardData = jobCardsData[cardId];
                    if (!cardData) return null;
                    
                    return (
                      <SortableJobCard key={cardId} id={cardId}>
                        <Link
                          href={cardData.href}
                          className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-all group"
                        >
                          <div className={`w-10 h-10 ${cardData.iconBg} rounded-lg flex items-center justify-center group-hover:bg-primary-100 transition-colors`}>
                            {cardData.icon}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{cardData.title}</p>
                            <p className="text-xs text-gray-500">{cardData.description}</p>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </SortableJobCard>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        );

      case SECTION_IDS.USER_INFO:
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
            {user && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-sm text-gray-900">
                    {user.first_name} {user.last_name}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-sm text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mobile</label>
                  <p className="text-sm text-gray-900">{user.mobile || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                  <p className="text-sm text-gray-900">{user.user_role || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Authority</label>
                  <p className="text-sm text-gray-900">{user.authority || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.status}
                  </span>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleSectionDragEnd}
    >
      <SortableContext
        items={sectionOrder}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {sectionOrder.map((sectionId) => (
            <SortableSection key={sectionId} id={sectionId}>
              {renderSection(sectionId)}
            </SortableSection>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
