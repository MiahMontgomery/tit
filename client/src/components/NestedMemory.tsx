import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Code, Camera, FileText, Play, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface NestedItem {
  id: string;
  type: 'screenshot' | 'code' | 'file' | 'execution' | 'notification' | 'proof';
  title: string;
  content: string;
  timestamp: string;
  data?: any;
  nested?: NestedItem[];
  isExpanded?: boolean;
}

interface NestedMemoryProps {
  items: NestedItem[];
  onToggleExpand?: (id: string) => void;
  onAction?: (action: string, item: NestedItem) => void;
}

const NestedMemory: React.FC<NestedMemoryProps> = ({ items, onToggleExpand, onAction }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
    onToggleExpand?.(id);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'screenshot':
        return <Camera className="w-4 h-4 text-blue-500" />;
      case 'code':
        return <Code className="w-4 h-4 text-green-500" />;
      case 'file':
        return <FileText className="w-4 h-4 text-purple-500" />;
      case 'execution':
        return <Play className="w-4 h-4 text-orange-500" />;
      case 'notification':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'proof':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'screenshot':
        return 'border-blue-200 bg-blue-50';
      case 'code':
        return 'border-green-200 bg-green-50';
      case 'file':
        return 'border-purple-200 bg-purple-50';
      case 'execution':
        return 'border-orange-200 bg-orange-50';
      case 'notification':
        return 'border-yellow-200 bg-yellow-50';
      case 'proof':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200';
    }
  };

  const renderContent = (item: NestedItem) => {
    switch (item.type) {
      case 'screenshot':
        return (
          <div className="space-y-2">
            <img 
              src={item.data?.screenshotPath || item.data?.url} 
              alt={item.title}
              className="max-w-full h-auto rounded border"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-screenshot.png';
              }}
            />
            <p className="text-sm text-gray-600">{item.content}</p>
          </div>
        );
      
      case 'code':
        return (
          <div className="space-y-2">
            <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto">
              <code>{item.data?.code || item.content}</code>
            </pre>
            <p className="text-sm text-gray-600">{item.content}</p>
          </div>
        );
      
      case 'file':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-purple-500" />
              <span className="font-medium">{item.data?.filename || 'File'}</span>
            </div>
            <pre className="bg-gray-800 p-3 rounded text-sm overflow-x-auto max-h-40" style={{ color: '#e0e0e0' }}>
              <code>{item.data?.content || item.content}</code>
            </pre>
          </div>
        );
      
      case 'execution':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Play className="w-4 h-4 text-orange-500" />
              <span className="font-medium">{item.title}</span>
            </div>
            <div className="p-3 rounded" style={{ backgroundColor: 'var(--muted)' }}>
              <p className="text-sm">{item.content}</p>
              {item.data?.output && (
                <pre className="mt-2 text-xs p-2 rounded border" style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)' }}>
                  {JSON.stringify(item.data.output, null, 2)}
                </pre>
              )}
            </div>
          </div>
        );
      
      case 'notification':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">{item.title}</span>
            </div>
            <p className="text-sm text-gray-600">{item.content}</p>
            {item.data && (
              <div className="text-xs text-gray-500">
                {JSON.stringify(item.data, null, 2)}
              </div>
            )}
          </div>
        );
      
      case 'proof':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="font-medium">{item.title}</span>
            </div>
            <p className="text-sm text-gray-600">{item.content}</p>
            {item.data && (
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <pre className="text-xs text-green-800">
                  {JSON.stringify(item.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div className="space-y-2">
            <p className="text-sm">{item.content}</p>
            {item.data && (
              <div className="text-xs text-gray-500">
                {JSON.stringify(item.data, null, 2)}
              </div>
            )}
          </div>
        );
    }
  };

  const renderItem = (item: NestedItem, depth = 0) => {
    const isExpanded = expandedItems.has(item.id);
    const hasNested = item.nested && item.nested.length > 0;

    return (
      <div key={item.id} className="space-y-1">
        <div 
          className={`
            border rounded-lg p-3 cursor-pointer transition-all duration-200
            ${getStatusColor(item.type)}
            ${isExpanded ? 'shadow-md' : 'hover:shadow-sm'}
          `}
          style={{ marginLeft: `${depth * 16}px` }}
          onClick={() => hasNested && toggleExpand(item.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {hasNested && (
                <button className="p-1 hover:bg-gray-200 rounded">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
              {getIcon(item.type)}
              <span className="font-medium text-sm">{item.title}</span>
              <span className="text-xs text-gray-500">
                {new Date(item.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            {item.type === 'execution' && (
              <div className="flex space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.('retry', item);
                  }}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Retry
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.('rollback', item);
                  }}
                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Rollback
                </button>
              </div>
            )}
          </div>
          
          {isExpanded && (
            <div className="mt-3">
              {renderContent(item)}
              
              {hasNested && (
                <div className="mt-3 space-y-2">
                  {item.nested!.map(nestedItem => renderItem(nestedItem, depth + 1))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {items.map(item => renderItem(item))}
    </div>
  );
};

export default NestedMemory;
