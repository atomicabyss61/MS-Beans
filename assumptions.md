- When channelsCreateV1 creates a channel, the creator is added to the channel
  as both a member and an owner.
- The parameters for authRegisterV1 - nameFirst and nameLast will contain at least one alphanumeric character (i.e. the handle is not an empty string).
- Assume that if the start parameter in channelMessagesV1 is equal to the total number of messages, an empty list of messages is returned.
- Email comparisons are case insensitive in authRegisterV1 and authLoginV1.
- Multiple channels can exist with the same name and creator, but they must have different ids.
- If data is cleared, the new global owner is the user who signs up first after the clear.