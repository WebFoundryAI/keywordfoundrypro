import { useSearchParams } from 'react-router-dom';
import { MemberManager } from '@/components/projects/MemberManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export default function ProjectMembers() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-4">Project Team Members</h1>
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            No project selected. Please provide a projectId parameter in the URL.
            <br />
            <span className="text-sm text-muted-foreground mt-2 block">
              Example: /project-members?projectId=your-project-id
            </span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Project Team Members</h1>
        <p className="text-muted-foreground mt-2">
          Manage team access and permissions for this project
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Team Collaboration</CardTitle>
          <CardDescription>
            Add team members and assign roles to collaborate on this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Role Permissions</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <span className="font-medium text-purple-600">Owner</span> - Full control,
                  can manage members and delete the project
                </li>
                <li>
                  <span className="font-medium text-blue-600">Editor</span> - Can modify
                  project resources and settings
                </li>
                <li>
                  <span className="font-medium text-green-600">Commenter</span> - Can add
                  comments and suggestions
                </li>
                <li>
                  <span className="font-medium text-gray-600">Viewer</span> - Read-only
                  access to project data
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <MemberManager projectId={projectId} />
    </div>
  );
}
