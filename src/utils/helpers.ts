import { API_TEAM_REGEX, CYPRESS_DEFEND_REGEX, CYPRESS_OSQUERY_REGEX, CYPRESS_TEAM_REGEX, DETECTIONS_REGEX, DETECTIONS_RESPONSE_REGEX } from "./regex";

export interface TestCounts {
    describeSkipCount: number;
    describeCount: number;
    itSkipCount: number;
    itCount: number;
    itInDescribeSkipCount: number;
  }

export const initializeCounts = () =>  {
    return {
      describeSkipCount: 0,
      describeCount: 0,
      itSkipCount: 0,
      itCount: 0,
      itInDescribeSkipCount: 0
    };
  }
  
export const createTestData = (filePath: string, team: string | null, counts: TestCounts, type: string) : Record<string, any> => {
    return {
      "@timestamp": new Date().toISOString(),
      team,
      filePath,
      totalTests: counts.itCount,
      skippedTests: counts.itSkipCount,
      type
    };
  }

export const determineTeam = (filePath: string, type: string): string | null =>  {
  
    let team: string | null  = null
  
  if(filePath.match(CYPRESS_DEFEND_REGEX)){
     team = 'edr_workflows'
      
  } else if(filePath.match(CYPRESS_OSQUERY_REGEX)){
     team = 'edr_workflows'
   } else {
    const regex = type === 'cypress' ? CYPRESS_TEAM_REGEX : API_TEAM_REGEX;
    let teamMatch = filePath.match(regex);
    team = teamMatch ? teamMatch[1] : null;
  
    if (team?.match(DETECTIONS_REGEX)) {
      const subTeamMatch = filePath.match(DETECTIONS_RESPONSE_REGEX);
      team = subTeamMatch ? subTeamMatch[1] : null;
    }
  }  

  const teamMap: Record<string, string> = {
    investigation: 'investigations',
    rules_management: 'rule_management',
    telemetry: 'detection_engine',
    user_roles: 'detection_engine',
    lists_and_exception_lists: 'detection_engine',
    sources: 'detection_engine'
  };

  return team ? teamMap[team] || team : null;

  }  
  