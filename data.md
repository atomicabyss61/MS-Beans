```javascript
let data = {
    users: [
        {
            authUserId: 1,
            nameFirst: 'Example',
            nameLast: 'User',
            email: 'example@gmail.com',
            handleStr: 'exampleuser',
            password: 'securepasswordinplaintext',
            permissionId: 1,
        },
    ],

    channels: [
        {
            channelId: 1,
            name: 'General',
            isPublic: true,
            ownerMembers: [
                {
                    uId: 1,
                    email: 'example@gmail.com',
                    nameFirst: 'Example',
                    nameLast: 'User',
                    handleStr: 'exampleuser',
                },
            ],

            allMembers: [
                {
                    uId: 1,
                    email: 'example@gmail.com',
                    nameFirst: 'Example',
                    nameLast: 'User',
                    handleStr: 'exampleuser',
                },
            ],

            messages: [
                {
                    messageId: 1,
                    uId: 1,
                    message: 'Hello world',
                    timeSent: 1582426789,

                    reacts: [
                            {
                            reactId: 1,
                            uIds: [ 1, 2, 3 ],
                            isThisUserReacted: false
                            }
                    ],
                    isPinned: false,
                },
            ],

            invites: [
                {
                    uId: 1,
                    timeStamp: 3213213123,
                    inviterId: 2,
                }

            ],

            standup: {
                starter: 1,
                timeFinish: 1582426789,
                messages: [
                    {
                        handle: 'exampleuser',
                        message: 'Hello world',
                    }
                ],
                isActive: true,
            },
        },
    ],

    dms: [
        {
            dmId: 2,
            name: 'exampleuser1',
            ownerId: 1,
            allMembers: [
                {
                    uId: 1,
                    email: 'example@gmail.com',
                    nameFirst: 'Example',
                    nameLast: 'User',
                    handleStr: 'exampleuser1',
                },
            ],

            messages: [
                {
                    messageId: 1,
                    uId: 1,
                    message: 'Hello world',
                    timeSent: 1582426789,
                },
            ],
        },
    ],
};
```

short description:

    users:
    - authUserId is for user operations, and is the equivalent of uId
    - nameFirst and nameLast are for identification
    - email is for sign up/correspondence and sign in
    - handle is for user contact and sign in
    - password is for sign in
    - permissionId is a number if the user is a global owner

    channels:
    - channelId is for channel operations
    - name is for identification
    - isPublic is for changing access/privacy settings
    - ownerMembers is the group of all the users which own the channel
    - allMembers is the group of all the users which have access to the channel (includes ownerMembers)
    - messages is all of the messages in the channel
    - standup is an object showing details of the standup

    dms:
    - dmId is for dm operations
    - name is made from users within (non-unique)
    - ownerId is the owner's id
    - allMembers is the group of all the users which have access to the channel (includes owner)
    - messages is all of the messages in the channel