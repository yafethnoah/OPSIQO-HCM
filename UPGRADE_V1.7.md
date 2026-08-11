# Upgrade to OPSIQO HCM v1.7

## From v1.6
1. Back up Firestore and Storage.
2. Deploy the updated Firestore indexes and rules in staging.
3. Add a production-grade `OPSIQO_SURVEY_ANONYMITY_SECRET` (32+ random characters).
4. Run dependency installation and all acceptance tests.
5. Run the seed only in a disposable/demo environment.
6. Configure the service catalog, survey privacy notices, audience rules and approved retention schedule before production launch.

## Required environment addition
```env
OPSIQO_SURVEY_ANONYMITY_SECRET=<32+ random secret>
```
Production runtime rejects anonymous survey operations if this dedicated secret is absent.

## New collections
- employeeSurveys
- surveyResponses
- surveyParticipationIndex
- serviceCatalogItems
- hrServiceTickets
- serviceTicketComments
- serviceSatisfaction
- knowledgeArticles
- recognitions
- employeeIdeas

## New permissions
- experience.read
- experience.survey
- experience.manage
- service.read
- service.request
- service.manage
- recognition.send
- recognition.manage

## New automation command
```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run experience:review
```

## Production migration notes
No migration should fabricate survey responses, employee ideas, service tickets or satisfaction records. Existing HR mailbox/helpdesk history should be imported only through a documented mapping with source evidence and privacy/retention review.
