import { Helmet } from 'react-helmet-async';
import { ComponentLibrary } from '@/components/workflow/ComponentLibrary';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { ConfigurationPanel } from '@/components/workflow/ConfigurationPanel';
import { WorkflowToolbar } from '@/components/workflow/WorkflowToolbar';
import { ChatModal } from '@/components/workflow/ChatModal';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Workflow Builder - Visual AI Workflow Designer</title>
        <meta 
          name="description" 
          content="Build intelligent workflows with drag-and-drop components. Connect AI models, knowledge bases, and custom logic to create powerful automation." 
        />
      </Helmet>
      
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <WorkflowToolbar />
        
        <div className="flex-1 flex overflow-hidden">
          <ComponentLibrary />
          <WorkflowCanvas />
          <ConfigurationPanel />
        </div>
        
        <ChatModal />
      </div>
    </>
  );
};

export default Index;
