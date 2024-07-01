## Workflows

This was a feature that was implemented to be able to generate customized actions according to the client's needs, in this particular case for wallet cards. In this case, actions can be generated (such as notifying the user through messages or updating points in the card). Generate timers so that the actions occur within a certain period of time and conditions that will help us categorize the actions.

For this project it was decided to use an in-memory database to avoid setbacks in configuring and running the project. It was decided to run tests in jest so that only the ``npm run test`` command had to be run so that we could quickly see how everything works.

Note: In this case I'm trying to show the solution we brought for this particular feature. Code might not be the best in this case but because the short time I had most of the code was adapted to present just a portion of the solution.

Node version: ``v20.10.0``

Here is a diagram of the case we will be analyzing.

![Blank diagram (1)](https://github.com/Moises311/workflows/assets/174307557/bcd5d6a3-9db6-4241-b2b9-403328f03cd9)

### Case 1
Cardholder has less than 201 points, it will receive a push notification saying that it does not have enough points to participate. (Default case)

### Case 2
Cardholder has enough points to earn 100 points. We will have a timer to intrigue the user (5 minutes). And after that send a push notification to warn the user he earned some points.

### Case 3
Cardholder has more than 999 points. User will receive a funny message since he has enough points.

## Setup
Run the following commands
1. ``npm i``
2. ``npm run test``

## Technical details

### Condition groups
These are like switch statements that can be used as ``if else`` or as a switch statement where we can execute more than one criteria if we decide to.

### Conditions
Here we do all comparations. List of posible operators: ``eq | ne | gt | lt | ge | le | in | nin | contains | ncontains``

### Timers
In this case we are emulating them in the test cases, but in the real implementation we are scheduling them in ``AWS eventbridge`` service.

### Actions
For this demo purpose we decided to keep it simple. Message and points. But in the real implementation we have reward assignment, update a set of data, webhooks, transactions etc...
Actions like ``message`` serve as push notifications so a cardholder can receive custom messages.
