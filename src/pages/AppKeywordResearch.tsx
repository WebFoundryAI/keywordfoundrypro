import { OnboardingTour } from "@/components/OnboardingTour";

const AppKeywordResearch = () => {
  return (
    <>
      <OnboardingTour />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4">Keyword Research</h1>
        <p className="text-muted-foreground">
          Your keyword research dashboard will appear here.
        </p>
      </div>
    </>
  );
};

export default AppKeywordResearch;
