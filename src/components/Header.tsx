import { Search } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { UserMenu } from "@/components/UserMenu";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  user?: any;
}

export const Header = ({ user }: HeaderProps) => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleLogoClick}
          >
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Search className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Keyword Research</h1>
              <p className="text-xs text-muted-foreground">Professional SEO Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Navigation />
            {user && <UserMenu />}
          </div>
        </div>
      </div>
    </header>
  );
};