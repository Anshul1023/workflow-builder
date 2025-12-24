import { supabase } from '@/integrations/supabase/client';
import { WorkflowNode } from '@/types/workflow';
import { Edge } from 'reactflow';

export interface SavedWorkflow {
  id: string;
  name: string;
  description: string | null;
  nodes: WorkflowNode[];
  edges: Edge[];
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  workflow_id: string | null;
  name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  content: string | null;
  created_at: string;
}

export const workflowDb = {
  // Save workflow
  async saveWorkflow(
    name: string,
    nodes: WorkflowNode[],
    edges: Edge[],
    description?: string
  ): Promise<SavedWorkflow | null> {
    const { data, error } = await supabase
      .from('workflows')
      .insert({
        name,
        description: description || null,
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving workflow:', error);
      return null;
    }

    return {
      ...data,
      nodes: data.nodes as unknown as WorkflowNode[],
      edges: data.edges as unknown as Edge[],
    };
  },

  // Update workflow
  async updateWorkflow(
    id: string,
    nodes: WorkflowNode[],
    edges: Edge[],
    name?: string
  ): Promise<boolean> {
    const updateData: Record<string, unknown> = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    if (name) updateData.name = name;

    const { error } = await supabase
      .from('workflows')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating workflow:', error);
      return false;
    }
    return true;
  },

  // Get all workflows
  async getWorkflows(): Promise<SavedWorkflow[]> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching workflows:', error);
      return [];
    }

    return (data || []).map((w) => ({
      ...w,
      nodes: w.nodes as unknown as WorkflowNode[],
      edges: w.edges as unknown as Edge[],
    }));
  },

  // Get single workflow
  async getWorkflow(id: string): Promise<SavedWorkflow | null> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching workflow:', error);
      return null;
    }

    return {
      ...data,
      nodes: data.nodes as unknown as WorkflowNode[],
      edges: data.edges as unknown as Edge[],
    };
  },

  // Delete workflow
  async deleteWorkflow(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting workflow:', error);
      return false;
    }
    return true;
  },

  // Upload document
  async uploadDocument(
    file: File,
    workflowId?: string
  ): Promise<Document | null> {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `uploads/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return null;
    }

    // Extract text content for text files
    let content: string | null = null;
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      content = await file.text();
    }

    // Save document record
    const { data, error } = await supabase
      .from('documents')
      .insert({
        workflow_id: workflowId || null,
        name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving document record:', error);
      return null;
    }

    return data;
  },

  // Get documents for workflow
  async getDocuments(workflowId?: string): Promise<Document[]> {
    let query = supabase.from('documents').select('*');
    
    if (workflowId) {
      query = query.eq('workflow_id', workflowId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return [];
    }

    return data || [];
  },

  // Delete document
  async deleteDocument(id: string, filePath: string): Promise<boolean> {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([filePath]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
    }

    // Delete record
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting document record:', error);
      return false;
    }
    return true;
  },

  // Get document download URL
  getDocumentUrl(filePath: string): string {
    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);
    return data.publicUrl;
  },
};
