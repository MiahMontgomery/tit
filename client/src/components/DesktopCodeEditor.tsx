import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Folder, 
  FolderOpen, 
  Code, 
  Save, 
  Play, 
  Terminal,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit,
  Eye,
  Download,
  Upload
} from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  content?: string;
  isExpanded?: boolean;
}

interface DesktopCodeEditorProps {
  projectId: string;
}

export function DesktopCodeEditor({ projectId }: DesktopCodeEditorProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    setIsElectron(typeof window !== 'undefined' && (window as any).electronAPI);
    
    if (isElectron) {
      loadProjectFiles();
    }
  }, [isElectron, projectId]);

  const loadProjectFiles = async () => {
    if (!isElectron) return;
    
    setIsLoading(true);
    try {
      // Get project directory path
      const projectPath = await getProjectPath();
      if (projectPath) {
        setCurrentPath(projectPath);
        await loadDirectory(projectPath);
      }
    } catch (error) {
      console.error('Error loading project files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProjectPath = async (): Promise<string | null> => {
    if (!isElectron) return null;
    
    try {
      const appPath = await (window as any).electronAPI.getAppPath();
      return `${appPath}/data/projects/${projectId}`;
    } catch (error) {
      console.error('Error getting project path:', error);
      return null;
    }
  };

  const loadDirectory = async (dirPath: string) => {
    if (!isElectron) return;
    
    try {
      const result = await (window as any).electronAPI.readDirectory(dirPath);
      if (result.success) {
        const fileNodes: FileNode[] = result.files.map((file: any) => ({
          name: file.name,
          path: file.path,
          isDirectory: file.isDirectory,
          children: file.isDirectory ? [] : undefined
        }));
        setFiles(fileNodes);
      }
    } catch (error) {
      console.error('Error loading directory:', error);
    }
  };

  const loadFileContent = async (file: FileNode) => {
    if (!isElectron || file.isDirectory) return;
    
    setIsLoading(true);
    try {
      const result = await (window as any).electronAPI.readFile(file.path);
      if (result.success) {
        setFileContent(result.content);
        setSelectedFile(file);
      }
    } catch (error) {
      console.error('Error loading file content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFile = async () => {
    if (!isElectron || !selectedFile) return;
    
    try {
      const result = await (window as any).electronAPI.writeFile(selectedFile.path, fileContent);
      if (result.success) {
        console.log('File saved successfully');
      }
    } catch (error) {
      console.error('Error saving file:', error);
    }
  };

  const toggleFolder = async (folder: FileNode) => {
    if (!folder.isDirectory) return;
    
    const isExpanded = expandedFolders.has(folder.path);
    
    if (isExpanded) {
      // Collapse folder
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        newSet.delete(folder.path);
        return newSet;
      });
    } else {
      // Expand folder
      setExpandedFolders(prev => new Set(prev).add(folder.path));
      
      // Load folder contents
      try {
        const result = await (window as any).electronAPI.readDirectory(folder.path);
        if (result.success) {
          const children: FileNode[] = result.files.map((file: any) => ({
            name: file.name,
            path: file.path,
            isDirectory: file.isDirectory
          }));
          
          setFiles(prev => updateFileInTree(prev, folder.path, { children }));
        }
      } catch (error) {
        console.error('Error loading folder contents:', error);
      }
    }
  };

  const updateFileInTree = (files: FileNode[], targetPath: string, updates: Partial<FileNode>): FileNode[] => {
    return files.map(file => {
      if (file.path === targetPath) {
        return { ...file, ...updates };
      }
      if (file.children) {
        return { ...file, children: updateFileInTree(file.children, targetPath, updates) };
      }
      return file;
    });
  };

  const getFileIcon = (file: FileNode) => {
    if (file.isDirectory) {
      return expandedFolders.has(file.path) ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />;
    }
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return <Code className="h-4 w-4 text-blue-500" />;
      case 'json':
        return <FileText className="h-4 w-4 text-yellow-500" />;
      case 'md':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'css':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'html':
        return <FileText className="h-4 w-4 text-orange-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderFileTree = (files: FileNode[], level = 0) => {
    return files.map((file, index) => (
      <div key={file.path} style={{ marginLeft: `${level * 16}px` }}>
        <div
          className="flex items-center gap-2 p-2 cursor-pointer rounded"
          style={{
            backgroundColor: selectedFile?.path === file.path ? '#333333' : 'transparent'
          }}
          onClick={() => file.isDirectory ? toggleFolder(file) : loadFileContent(file)}
        >
          {file.isDirectory && (
            <div className="w-4 h-4 flex items-center justify-center">
              {expandedFolders.has(file.path) ? (
                <ChevronDown className="h-3 w-3" style={{ color: '#40e0d0' }} />
              ) : (
                <ChevronRight className="h-3 w-3" style={{ color: '#40e0d0' }} />
              )}
            </div>
          )}
          {!file.isDirectory && <div className="w-4 h-4" />}
          {getFileIcon(file)}
          <span className="text-sm" style={{ color: '#e0e0e0' }}>{file.name}</span>
        </div>
        
        {file.isDirectory && expandedFolders.has(file.path) && file.children && (
          <div>
            {renderFileTree(file.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (!isElectron) {
    return (
      <Card className="h-full" style={{ backgroundColor: '#0f0f0f', borderColor: '#333333' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: '#e0e0e0' }}>
            <Terminal className="h-5 w-5" style={{ color: '#40e0d0' }} />
            Code Editor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Terminal className="h-12 w-12 mx-auto mb-4" style={{ color: '#40e0d0' }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: '#e0e0e0' }}>Code Editor</h3>
            <p className="mb-4" style={{ color: 'var(--muted-foreground)' }}>
              Code editor functionality will be available when orchestrator generates code proofs.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex" style={{ backgroundColor: '#050505' }}>
      {/* File Tree Sidebar */}
      <div className="w-80 border-r" style={{ borderColor: '#333333', backgroundColor: '#0f0f0f' }}>
        <div className="p-4 border-b" style={{ borderColor: '#333333' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium" style={{ color: '#e0e0e0' }}>Project Files</h3>
            <Button size="sm" variant="outline" onClick={loadProjectFiles} style={{ 
              borderColor: '#40e0d0',
              color: '#40e0d0',
              backgroundColor: 'transparent'
            }}>
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs" style={{ color: '#888888' }}>
            {currentPath || 'No project loaded'}
          </div>
        </div>
        
        <ScrollArea className="flex-1 p-2">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto" style={{ borderColor: '#40e0d0' }}></div>
              <p className="text-sm mt-2" style={{ color: '#888888' }}>Loading files...</p>
            </div>
          ) : (
            <div className="space-y-1">
              {renderFileTree(files)}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Code Editor */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getFileIcon(selectedFile)}
                  <span className="font-medium">{selectedFile.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {selectedFile.path.split('.').pop()?.toUpperCase() || 'FILE'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={saveFile}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline">
                    <Play className="h-4 w-4 mr-1" />
                    Run
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 p-4">
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="w-full h-full font-mono text-sm border border-gray-300 rounded p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="File content will appear here..."
                spellCheck={false}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--foreground)' }}>No File Selected</h3>
              <p className="text-gray-600">Select a file from the sidebar to view and edit its contents.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
