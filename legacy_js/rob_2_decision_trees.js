import { Answer, DomainRisk } from "./rob_2_utils.js"

export function traverseTree(node, answers) {
  // Terminal node with an outcome.
  if (node.outcome) {
    return node.outcome;
  }

  // Determine the user's answer for this node.
  let userAnswer;
  // If node.id is an array and a custom evaluate function is provided, use it.
  if (Array.isArray(node.id) && typeof node.evaluate === "function") {
    userAnswer = node.evaluate(answers);
  } else {
    // Otherwise, use the answer keyed by the node's id.
    userAnswer = answers[node.id];
  }

  // Find the branch that accepts this answer.
  const branch = node.answers.find(branch => branch.accepted.includes(userAnswer));
  if (!branch) {
    return "null"
  }

  // Recursively traverse to the next node (if it exists).
  return traverseTree(branch.next || branch, answers);
}

export function getDomainAnswers(domain, num_q) {
  // Mapping from normalized inner text to the enum value.
  const answerMapping = {
    "Yes": Answer.YES,
    "Prob Yes": Answer.PYES,
    "Prob No": Answer.PNO,
    "No": Answer.NO,
    "No info": Answer.NOINFO
  };

  // Helper to normalize text (replaces whitespace/newlines and trims)
  const normalize = (text) => text && text.replace(/\s+/g, " ").trim();

  const answers = {};

  // Loop through each question number for this domain.
  for (let i = 1; i <= num_q; i++) {
    const questionId = `q${domain}_${i}`;
    const radioSelector = `input[name="${questionId}"]:checked`;
    const rawText = document.querySelector(radioSelector)?.nextElementSibling.innerText;

    // Assign the mapped answer to the key. If no answer is found, assign null.
    answers[questionId] = answerMapping[normalize(rawText)] || "null";
  }

  return answers;
}


export const D1_DT = {
  id: "q1_2",
  answers: [
    {
      accepted: [Answer.YES, Answer.PYES],
      next: {
        id: "q1_1",
        answers: [
          {
            accepted: [Answer.YES, Answer.PYES, Answer.NOINFO],
            next: {
              id: "q1_3",
              answers: [
                {
                  accepted: [Answer.NO, Answer.PNO, Answer.NOINFO],
                  outcome: DomainRisk.Low
                },
                {
                  accepted: [Answer.YES, Answer.PYES],
                  outcome: DomainRisk.Concerns
                },
              ]
            }
          },
          {
            accepted: [Answer.NO, Answer.PNO],
            outcome: DomainRisk.Concerns
          },
        ]
      }
    },
    {
      accepted: [Answer.NOINFO],
      next: {
        id: "q1_3",
        answers: [
          {
            accepted: [Answer.NO, Answer.PNO, Answer.NOINFO],
            outcome: DomainRisk.Concerns
          },
          {
            accepted: [Answer.YES, Answer.PYES],
            outcome: DomainRisk.High
          },
        ]
      }
    },
    {
      accepted: [Answer.NO, Answer.PNO],
      outcome: DomainRisk.High
    }
  ]
};

export const D2_P1_DT = {
  // Instead of a single question id, provide an array of IDs.
  id: ["q2_1", "q2_2"],
  // A custom function to compute a composite answer based on the user's answers.
  evaluate: (answers) => {
    const goodpath = [Answer.NO, Answer.PNO];
    // If both q11 and q12 are low answers, return a canonical composite key.
    if (goodpath.includes(answers.q2_1) && goodpath.includes(answers.q2_2)) {
      return "good";
    }
    // Otherwise, if either is not in lowAnswers, treat it as "anyHigh".
    return "bad";
  },
  answers: [
    {
      accepted: ["good"],
      outcome: DomainRisk.Low
    },
    {
      accepted: ["bad"],
      next: {
        id: "q2_3",
        answers: [
          {
            accepted: [Answer.NO, Answer.PNO],
            outcome: DomainRisk.Low
          },
          {
            accepted: [Answer.NOINFO],
            outcome: DomainRisk.Concerns
          },
          {
            accepted: [Answer.YES, Answer.PYES],
            next: {
              id: "q2_4",
              answers: [
                {
                  accepted: [Answer.NO, Answer.PNO],
                  outcome: DomainRisk.Concerns
                },
                {
                  accepted: [Answer.YES, Answer.PYES, Answer.NOINFO],
                  next: {
                    id: "q2_5",
                    answers: [
                      {
                        accepted: [Answer.YES, Answer.PYES],
                        outcome: DomainRisk.Concerns
                      },
                      {
                        accepted: [Answer.NO, Answer.PNO, Answer.NOINFO],
                        outcome: DomainRisk.High
                      },
                    ]
                  }
                },
              ]
            }
          },
        ]
      }
    }
  ]
};

export const D2_P2_DT = {
  id: "q2_6",
  answers: [
    {
      accepted: [Answer.YES, Answer.PYES],
      outcome: DomainRisk.Low
    },
    {
      accepted: [Answer.NO, Answer.PNO, Answer.NOINFO],
      next: {
        id: "q2_7",
        answers: [
          {
            accepted: [Answer.NO, Answer.PNO],
            outcome: DomainRisk.Concerns
          },
          {
            accepted: [Answer.YES, Answer.PYES, Answer.NOINFO],
            outcome: DomainRisk.High
          },
        ]
      }
    },
  ]
}

export const D2B_DT = {
  id: ["q2b_1", "q2b_2"],
  evaluate: (answers) => {
    const goodpath = [Answer.NO, Answer.PNO];
    if (goodpath.includes(answers.q2b_1) && goodpath.includes(answers.q2b_2)) {
      return "good";
    }
    return "bad";
  },
  answers: [
    {
      accepted: ["good"],
      next: {
        id: ["q2b_4", "q2b_5"],
        evaluate: (answers) => {
          const goodpath = [Answer.NO, Answer.PNO];
          if (goodpath.includes(answers.q2b_4) && goodpath.includes(answers.q2b_5)) {
            return "good";
          }
          return "bad";
        },
        answers: [
          {
            accepted: ["good"],
            outcome: DomainRisk.Low
          },
          {
            accepted: ["bad"],
            next: {
              id: "q2b_6",
              answers: [
                {
                  accepted: [Answer.YES, Answer.PYES],
                  outcome: DomainRisk.Concerns
                },
                {
                  accepted: [Answer.NO, Answer.PNO, Answer.NOINFO],
                  outcome: DomainRisk.High
                }
              ]
            }
          }
        ]
      }
    },
    {
      accepted: ["bad"],
      next: {
        id: "q2b_3",
        answers: [
          {
            accepted: [Answer.YES, Answer.PYES],
            next: {

              id: ["q2b_4", "q2b_5"],
              evaluate: (answers) => {
                const goodpath = [Answer.NO, Answer.PNO];
                if (goodpath.includes(answers.q2b_4) && goodpath.includes(answers.q2b_5)) {
                  return "good";
                }
                return "bad";
              },
              answers: [
                {
                  accepted: ["good"],
                  outcome: DomainRisk.Low
                },
                {
                  accepted: ["bad"],
                  next: {
                    id: "q2b_6",
                    answers: [
                      {
                        accepted: [Answer.YES, Answer.PYES],
                        outcome: DomainRisk.Concerns
                      },
                      {
                        accepted: [Answer.NO, Answer.PNO, Answer.NOINFO],
                        outcome: DomainRisk.High
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            accepted: [Answer.NO, Answer.PNO, Answer.NOINFO],
            next: {
              id: "q2b_6",
              answers: [
                {
                  accepted: [Answer.YES, Answer.PYES],
                  outcome: DomainRisk.Concerns
                },
                {
                  accepted: [Answer.NO, Answer.PNO, Answer.NOINFO],
                  outcome: DomainRisk.High
                }
              ]
            }
          }
        ]
      }
    }
  ]
};


export const D3_DT = {
  id: "q3_1",
  answers: [
    {
      accepted: [Answer.YES, Answer.PYES],
      outcome: DomainRisk.Low
    },
    {
      accepted: [Answer.NO, Answer.PNO, Answer.NOINFO],
      next: {
        id: "q3_2",
        answers: [
          {
            accepted: [Answer.YES, Answer.PYES],
            outcome: DomainRisk.Low
          },
          {
            accepted: [Answer.NO, Answer.PNO],
            next: {
              id: "q3_3",
              answers: [
                {
                  accepted: [Answer.NO, Answer.PNO],
                  outcome: DomainRisk.Low
                },
                {
                  accepted: [Answer.YES, Answer.PYES, Answer.NOINFO],
                  next: {
                    id: "q3_4",
                    answers: [
                      {
                        accepted: [Answer.NO, Answer.PNO],
                        outcome: DomainRisk.Concerns
                      },
                      {
                        accepted: [Answer.YES, Answer.PYES, Answer.NOINFO],
                        outcome: DomainRisk.High
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ]
};


export const D4_DT = {
  id: "q4_1",
  answers: [
    {
      accepted: [Answer.YES, Answer.PYES],
      outcome: DomainRisk.High
    },
    {
      accepted: [Answer.NO, Answer.PNO, Answer.NOINFO],
      next: {
        id: "q4_2",
        answers: [
          {
            accepted: [Answer.YES, Answer.PYES],
            outcome: DomainRisk.High
          },
          {
            accepted: [Answer.NOINFO],
            next: {
              id: "q4_3",
              answers: [
                {
                  accepted: [Answer.NO, Answer.PNO],
                  outcome: DomainRisk.Concerns
                },
                {
                  accepted: [Answer.YES, Answer.PYES, Answer.NOINFO],
                  next: {
                    id: "q4_4",
                    answers: [
                      {
                        accepted: [Answer.NO, Answer.PNO],
                        outcome: DomainRisk.Concerns

                      },
                      {
                        accepted: [Answer.YES, Answer.PYES, Answer.NOINFO],
                        next: {
                          id: "q4_5",
                          answers: [
                            {
                              accepted: [Answer.NO, Answer.PNO],
                              outcome: DomainRisk.Concerns

                            },
                            {
                              accepted: [Answer.YES, Answer.PYES, Answer.NOINFO],
                              outcome: DomainRisk.High
                            },
                          ]
                        }
                      },
                    ]
                  }
                }
              ]
            }

          },
          {
            accepted: [Answer.NO, Answer.PNO],
            next: {
              id: "q4_3",
              answers: [
                {
                  accepted: [Answer.NO, Answer.PNO],
                  outcome: DomainRisk.Low
                },
                {
                  accepted: [Answer.YES, Answer.PYES, Answer.NOINFO],
                  next: {
                    id: "q4_4",
                    answers: [
                      {
                        accepted: [Answer.NO, Answer.PNO],
                        outcome: DomainRisk.Low

                      },
                      {
                        accepted: [Answer.YES, Answer.PYES, Answer.NOINFO],
                        next: {
                          id: "q4_5",
                          answers: [
                            {
                              accepted: [Answer.NO, Answer.PNO],
                              outcome: DomainRisk.Concerns

                            },
                            {
                              accepted: [Answer.YES, Answer.PYES, Answer.NOINFO],
                              outcome: DomainRisk.High
                            },
                          ]
                        }
                      },
                    ]

                  }

                },
              ]
            }
          },
        ]
      }
    }
  ]
}


export const D5_DT = {
  id: ["q5_2", "q5_3"],
  evaluate: (answers) => {
    if ([Answer.YES, Answer.PYES].includes(answers.q5_2) || [Answer.YES, Answer.PYES].includes(answers.q5_3)) {
      return "high";
    } else if ([Answer.NO, Answer.PNO].includes(answers.q5_2) && [Answer.NO, Answer.PNO].includes(answers.q5_3)) {
      return "low"
    } else if (answers.q5_2 == "null" || answers.q5_3 == "null") {
      return "null"
    } else {
      return "mid";
    }
  },
  answers: [
    {
      accepted: ["high"],
      outcome: DomainRisk.High
    },
    {
      accepted: ["mid"],
      outcome: DomainRisk.Concerns
    },
    {
      accepted: ["low"],
      next: {
        id: "q5_1",
        answers: [
          {
            accepted: [Answer.YES, Answer.PYES],
            outcome: DomainRisk.Low
          },
          {
            accepted: [Answer.NO, Answer.PNO, Answer.NOINFO],
            outcome: DomainRisk.Concerns

          },
        ]
      }

    },
  ]
}

