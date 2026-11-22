p='firestore.rules'
s=open(p,encoding='utf-8').read()
a="      allow delete: if isSuperAdmin();\n    }\n\n    match /referralCodes/{code} {"
assert a in s
b='''      allow delete: if isSuperAdmin();

      // Append-only history of an ambassador's profile/payout edits. Values are stored already
      // masked. Readable by admins and by the ambassador the parent document belongs to; created
      // by that ambassador (while approved and active) or by an admin; never updated or deleted.
      match /changeLog/{entryId} {
        allow read: if isAdmin()
          || (verifiedEmail() && get(/databases/$(database)/documents/ambassadors/$(ambassadorId)).data.email == myEmail());
        allow create: if isAdmin()
          || (verifiedEmail()
              && get(/databases/$(database)/documents/ambassadors/$(ambassadorId)).data.email == myEmail()
              && get(/databases/$(database)/documents/ambassadors/$(ambassadorId)).data.isApproved == true
              && get(/databases/$(database)/documents/ambassadors/$(ambassadorId)).data.isActive == true
              && request.resource.data.by == myEmail());
        allow update, delete: if false;
      }
    }

    match /referralCodes/{code} {'''
s=s.replace(a,b,1)
open(p,'w',encoding='utf-8').write(s)
