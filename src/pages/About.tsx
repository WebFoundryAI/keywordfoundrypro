import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-6">About Keyword Foundry Pro</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-lg text-muted-foreground">
            Keyword Foundry Pro is a professional SEO research platform designed to help digital marketers, 
            content creators, and SEO specialists discover high-value keywords and analyze search engine results.
          </p>

          <h2 className="text-2xl font-semibold mt-8">Our Mission</h2>
          <p className="text-muted-foreground">
            We're committed to providing accurate, real-time SEO data that empowers businesses to make 
            data-driven decisions and improve their online visibility.
          </p>

          <h2 className="text-2xl font-semibold mt-8">Features</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Comprehensive keyword research with real-time metrics</li>
            <li>SERP analysis to understand competition</li>
            <li>Related keyword suggestions for content expansion</li>
            <li>Professional analytics and reporting</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default About;
