import { traverseTree, D1_DT, D2_P1_DT, D2_P2_DT, D2B_DT, D3_DT, D4_DT, D5_DT } from "./rob_2_decision_trees.js";

// TEST LOGIC:
function testTraverseTree1() {
  console.log("DOMAIN 1 TESTING")
  const tree = D1_DT; // Assume the tree structure is predefined elsewhere.

  function mockGetDomainAnswers(answers) {
    return answers;
  }

  function assertEqual(actual, expected, testName) {
    if (actual === expected) {
      console.log(`✅ ${testName}`);
    } else {
      console.error(`❌ ${testName} - Expected: ${expected}, but got: ${actual}`);
    }
  }

  // Test cases based on the flowchart
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q1_1: 'Yes', q1_2: 'Yes', q1_3: 'No' })),
    "Low risk",
    "Test Case 1: Low risk path"
  );

  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q1_1: 'Yes', q1_2: 'Yes', q1_3: 'Yes' })),
    "Some concerns",
    "Test Case 2: Some concerns path"
  );

  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q1_1: 'No', q1_2: 'No', q1_3: 'Yes' })),
    "High risk",
    "Test Case 3: High risk path"
  );

  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q1_1: 'Yes', q1_2: 'No', q1_3: 'No' })),
    "High risk",
    "Test Case 4: High risk"
  );

  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q1_1: 'No', q1_2: 'Yes', q1_3: 'No' })),
    "Some concerns",
    "Test Case 5: Another some concerns path"
  );
}

function testTraverseTree3() {
  console.log("DOMAIN 3 TESTING");
  const tree = D3_DT; // Assume the tree structure is predefined elsewhere.

  function mockGetDomainAnswers(answers) {
    return answers;
  }

  function assertEqual(actual, expected, testName) {
    if (actual === expected) {
      console.log(`✅ ${testName}`);
    } else {
      console.error(`❌ ${testName} - Expected: ${expected}, but got: ${actual}`);
    }
  }

  // Test cases based on the table
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q3_1: 'Yes', q3_2: 'NA', q3_3: 'NA', q3_4: 'NA' })),
    "Low risk",
    "Test Case 1: Complete data, Low risk"
  );

  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q3_1: 'No', q3_2: 'Yes', q3_3: 'NA', q3_4: 'NA' })),
    "Low risk",
    "Test Case 2: Evidence of no bias, Low risk"
  );

  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q3_1: 'No', q3_2: 'No', q3_3: 'No', q3_4: 'No' })),
    "Low risk",
    "Test Case 4: should be low risk"
  );

  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q3_1: 'No', q3_2: 'No', q3_3: 'Yes', q3_4: 'Yes' })),
    "High risk",
    "Test Case 5: Likely depend on true, High risk"
  );

  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q3_1: 'No', q3_2: 'No', q3_3: 'No', q3_4: 'Yes' })),
    "Low risk",
    "Test Case 6: low"
  );
}

function testTraverseTree4() {
  console.log("DOMAIN 4 TESTING");
  const tree = D4_DT; // Assume the tree structure is predefined elsewhere.

  function mockGetDomainAnswers(answers) {
    return answers;
  }

  function assertEqual(actual, expected, testName) {
    if (actual === expected) {
      console.log(`✅ ${testName}`);
    } else {
      console.error(`❌ ${testName} - Expected: ${expected}, but got: ${actual}`);
    }
  }

  // Test Case 1: Low risk path
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q4_1: 'No', q4_2: 'No', q4_3: 'No' })),
    "Low risk",
    "Test Case 1: Low risk path - q4_1: No, q4_2: No, q4_3: No"
  );

  // Test Case 2: Low risk path
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q4_1: 'No', q4_2: 'No', q4_3: 'Prob No' })),
    "Low risk",
    "Test Case 2: Low risk path - q4_1: No, q4_2: No, q4_3: Prob No"
  );

  // Test Case 3: Some concerns path
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q4_1: 'No', q4_2: 'No', q4_3: 'Yes', q4_4: 'No', q4_5: 'No' })),
    "Low risk",
    "Test Case 3: low risk path - q4_1: No, q4_2: No, q4_3: Yes, q4_4: No, q4_5: No"
  );

  // Test Case 4: Some concerns path
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q4_1: 'No', q4_2: 'No', q4_3: 'Yes', q4_4: 'Prob No', q4_5: 'No' })),
    "Low risk",
    "Test Case 4: low risk - q4_1: No, q4_2: No, q4_3: Yes, q4_4: Prob No, q4_5: No"
  );

  // Test Case 5: High risk path
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q4_1: 'Yes', q4_2: 'Yes' })),
    "High risk",
    "Test Case 5: High risk path - q4_1: Yes, q4_2: Yes"
  );

  // Test Case 6: High risk path
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q4_1: 'Prob Yes', q4_2: 'Yes' })),
    "High risk",
    "Test Case 6: High risk path - q4_1: Prob Yes, q4_2: Yes"
  );

  // Test Case 7: High risk path
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q4_1: 'No', q4_2: 'Yes', q4_3: 'Yes', q4_4: 'Yes', q4_5: 'Yes' })),
    "High risk",
    "Test Case 7: High risk path - q4_1: No, q4_2: Yes, q4_3: Yes, q4_4: Yes, q4_5: Yes"
  );

  // Test Case 8: High risk path
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q4_1: 'No', q4_2: 'Yes', q4_3: 'Yes', q4_4: 'Prob Yes', q4_5: 'Yes' })),
    "High risk",
    "Test Case 8: High risk path - q4_1: No, q4_2: Yes, q4_3: Yes, q4_4: Prob Yes, q4_5: Yes"
  );
}

function testTraverseTree5() {
  console.log("DOMAIN 5 TESTING");
  const tree = D5_DT; // Assume the tree structure is predefined elsewhere.

  function mockGetDomainAnswers(answers) {
    return answers;
  }

  function assertEqual(actual, expected, testName) {
    if (actual === expected) {
      console.log(`✅ ${testName}`);
    } else {
      console.error(`❌ ${testName} - Expected: ${expected}, but got: ${actual}`);
    }
  }

  // Test Case 1: Low risk path
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q5_1: 'Yes', q5_2: 'No', q5_3: 'No' })),
    "Low risk",
    "Test Case 1: Low risk path - q5_1: Yes, q5_2: No, q5_3: No"
  );

  // Test Case 2: Low risk path
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q5_1: 'Prob Yes', q5_2: 'No', q5_3: 'No' })),
    "Low risk",
    "Test Case 2: Low risk path - q5_1: Prob Yes, q5_2: No, q5_3: No"
  );

  // Test Case 3: Some concerns path
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q5_1: 'No info', q5_2: 'No', q5_3: 'No' })),
    "Some concerns",
    "Test Case 3: Some concerns path - q5_1: No Info, q5_2: No, q5_3: No"
  );

  // Test Case 4: Some concerns path
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q5_1: 'No', q5_2: 'No', q5_3: 'No' })),
    "Some concerns",
    "Test Case 4: Some concerns path - q5_1: No, q5_2: No, q5_3: No"
  );

  // Test Case 5: High risk path
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q5_1: 'Yes', q5_2: 'Yes', q5_3: 'No' })),
    "High risk",
    "Test Case 5: High risk path - q5_1: Yes, q5_2: Yes, q5_3: No"
  );

  // Test Case 6: High risk path
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q5_1: 'Yes', q5_2: 'No', q5_3: 'Yes' })),
    "High risk",
    "Test Case 6: High risk path - q5_1: Yes, q5_2: No, q5_3: Yes"
  );

  // Test Case 7: High risk path
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q5_1: 'Prob Yes', q5_2: 'Yes', q5_3: 'No' })),
    "High risk",
    "Test Case 7: High risk path - q5_1: Prob Yes, q5_2: Yes, q5_3: No"
  );

  // Test Case 8: High risk path
  assertEqual(
    traverseTree(tree, mockGetDomainAnswers({ q5_1: 'Prob Yes', q5_2: 'No', q5_3: 'Yes' })),
    "High risk",
    "Test Case 8: High risk path - q5_1: Prob Yes, q5_2: No, q5_3: Yes"
  );
}

export function runTests() {
  testTraverseTree1();
  testTraverseTree3();
  testTraverseTree4();
  testTraverseTree5();
}
