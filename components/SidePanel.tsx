import React, { useMemo } from "react";
import { XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import _ from "lodash";

import {
  RequirementEvaluation,
  Requirement,
  RequirementsData,
  EvaluationData,
  getSectionAggregateScore,
  getSentenceAggregateScore,
  getEnhancedRequirementsForSection,
  getEnhancedRequirementsForSentence,
  getEnhancedRequirementsForArticle,
} from "@/lib/eval";

// Import requirements data
import requirementsData from "@/lib/data/requirements.json";

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string | null;
  selectedType: "section" | "sentence" | "article" | null;
  evaluationData: EvaluationData | null;
  sectionIndex?: number;
  sentenceIndex?: number;
}

interface ScoreStats {
  totalRequirements: number;
  highScore: number;
  mediumScore: number;
  lowScore: number;
}

type EnhancedRequirementEvaluation = RequirementEvaluation &
  Partial<Requirement>;

export function SidePanel({
  isOpen,
  onClose,
  selectedText,
  selectedType,
  evaluationData,
  sectionIndex,
  sentenceIndex,
}: SidePanelProps) {
  if (!isOpen || !evaluationData) return null;

  // Memoize computations to prevent unnecessary recalculations
  const { overallScore, relevantEvaluations } = useMemo(() => {
    let score = 0;
    let evals: EnhancedRequirementEvaluation[] = [];

    console.log("Selected Type:", selectedType);
    console.log("Section Index:", sectionIndex);
    console.log("Sentence Index:", sentenceIndex);

    try {
      if (selectedType === "section" && typeof sectionIndex === "number") {
        score = getSectionAggregateScore(evaluationData, sectionIndex) * 100;
        evals = getEnhancedRequirementsForSection(
          evaluationData,
          sectionIndex,
          requirementsData as RequirementsData
        );
        console.log("Section Requirements:", evals);
      } else if (
        selectedType === "sentence" &&
        typeof sectionIndex === "number" &&
        typeof sentenceIndex === "number"
      ) {
        score =
          getSentenceAggregateScore(
            evaluationData,
            sectionIndex,
            sentenceIndex
          ) * 100;
        evals = getEnhancedRequirementsForSentence(
          evaluationData,
          sectionIndex,
          sentenceIndex,
          requirementsData as RequirementsData
        );
        console.log("Sentence Requirements:", evals);
      } else if (selectedType === "article") {
        evals = getEnhancedRequirementsForArticle(
          evaluationData,
          requirementsData as RequirementsData
        );
        console.log("Article Requirements:", evals);
        if (evaluationData.sections.length > 0) {
          const sectionScores = evaluationData.sections.map((section) =>
            getSectionAggregateScore(evaluationData, section.index)
          );
          score = (_.mean(sectionScores) || 0) * 100;
        }
      }

      console.log("Final Score:", score);
      console.log("Final Evaluations:", evals);
    } catch (error) {
      console.error("Error processing evaluations:", error);
      return { overallScore: 0, relevantEvaluations: [] };
    }

    return { overallScore: score, relevantEvaluations: evals };
  }, [evaluationData, selectedType, sectionIndex, sentenceIndex]);

  // Memoize grouped evaluations
  const groupedEvaluations = useMemo(() => {
    if (!relevantEvaluations?.length) {
      console.warn("No relevant evaluations to group");
      return {};
    }

    const grouped = _.groupBy(
      relevantEvaluations,
      "requirement_category"
    ) as Record<string, EnhancedRequirementEvaluation[]>;
    console.log("Grouped Evaluations:", grouped);
    return grouped;
  }, [relevantEvaluations]);

  // Memoize statistics calculations
  const stats: ScoreStats = useMemo(
    () => ({
      totalRequirements: relevantEvaluations?.length || 0,
      highScore: relevantEvaluations?.filter((e) => e.score >= 0.8).length || 0,
      mediumScore:
        relevantEvaluations?.filter((e) => e.score >= 0.5 && e.score < 0.8)
          .length || 0,
      lowScore: relevantEvaluations?.filter((e) => e.score < 0.5).length || 0,
    }),
    [relevantEvaluations]
  );

  const getScoreBadge = (score: number) => {
    if (score >= 0.8)
      return <Badge className="bg-green-100 text-green-800">High</Badge>;
    if (score >= 0.5)
      return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low</Badge>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div
      className="fixed right-0 top-0 h-full w-96 bg-white shadow-lg border-l z-50"
      role="complementary"
      aria-label="Analysis Panel"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold capitalize">
          {selectedType && selectedType !== "article"
            ? `${selectedType} Analysis`
            : "Article Analysis"}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close panel"
        >
          <XCircle className="h-6 w-6" />
        </button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="w-1/2">
            Overview
          </TabsTrigger>
          <TabsTrigger value="requirements" className="w-1/2">
            Requirements
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100vh-128px)]">
          <TabsContent value="overview" className="p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Overall Compliance Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress
                    value={overallScore}
                    className="w-full"
                    aria-label={`Overall score: ${overallScore.toFixed(1)}%`}
                  />
                  <p
                    className={`text-2xl font-bold ${getScoreColor(
                      overallScore
                    )}`}
                  >
                    {overallScore.toFixed(1)}%
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-green-50 p-2 rounded hover:bg-green-100 transition-colors">
                      <div className="text-green-700 font-bold">
                        {stats.highScore}
                      </div>
                      <div className="text-xs text-green-600">High</div>
                    </div>
                    <div className="bg-yellow-50 p-2 rounded hover:bg-yellow-100 transition-colors">
                      <div className="text-yellow-700 font-bold">
                        {stats.mediumScore}
                      </div>
                      <div className="text-xs text-yellow-600">Medium</div>
                    </div>
                    <div className="bg-red-50 p-2 rounded hover:bg-red-100 transition-colors">
                      <div className="text-red-700 font-bold">
                        {stats.lowScore}
                      </div>
                      <div className="text-xs text-red-600">Low</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedText && (
              <Card>
                <CardHeader>
                  <CardTitle>Selected Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{selectedText}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Categories Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(groupedEvaluations).map(
                    ([category, evals]: [
                      string,
                      EnhancedRequirementEvaluation[]
                    ]) => (
                      <div
                        key={category}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          const reqTab = document.querySelector(
                            '[value="requirements"]'
                          ) as HTMLElement;
                          reqTab?.click?.();
                        }}
                      >
                        <span className="font-medium">{category}</span>
                        <Badge>{evals.length} requirements</Badge>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requirements" className="p-4 space-y-4">
            {Object.entries(groupedEvaluations).map(
              ([category, evaluations]: [
                string,
                EnhancedRequirementEvaluation[]
              ]) => (
                <Card key={category} id={`category-${category.toLowerCase()}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {category}
                      <Badge>
                        {evaluations.length}{" "}
                        {evaluations.length === 1
                          ? "requirement"
                          : "requirements"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {evaluations.map((evaluation, index) => (
                      <Alert
                        key={index}
                        className="relative hover:shadow-md transition-shadow"
                        role="article"
                        aria-label={`Requirement ${evaluation.requirement_id}`}
                      >
                        <AlertTitle className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span>Requirement {evaluation.requirement_id}</span>
                            {getScoreBadge(evaluation.score)}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {evaluation.classification}
                          </Badge>
                        </AlertTitle>
                        <AlertDescription>
                          <div className="space-y-2 mt-2">
                            <div className="prose prose-sm max-w-none">
                              <p className="font-medium">
                                {evaluation.description}
                              </p>
                              <p className="text-gray-600">
                                {evaluation.reference}
                              </p>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Score</span>
                              <span
                                className={getScoreColor(
                                  evaluation.score * 100
                                )}
                              >
                                {(evaluation.score * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">
                                Confidence
                              </span>
                              <span>
                                {(evaluation.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="pt-2">
                              <p className="text-sm font-medium">Evidence</p>
                              <p className="text-sm text-gray-600">
                                {evaluation.evidence}
                              </p>
                            </div>
                            {evaluation.overlap_notes && (
                              <div className="pt-2">
                                <p className="text-sm font-medium">
                                  Overlap Notes
                                </p>
                                <p className="text-sm text-gray-600">
                                  {evaluation.overlap_notes}
                                </p>
                              </div>
                            )}
                            <div className="pt-2 flex flex-wrap gap-2">
                              {evaluation.where && (
                                <Badge variant="secondary" className="text-xs">
                                  Where: {evaluation.where}
                                </Badge>
                              )}
                              {evaluation.when && (
                                <Badge variant="secondary" className="text-xs">
                                  When: {evaluation.when}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </CardContent>
                </Card>
              )
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

export default SidePanel;