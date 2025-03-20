// this module is responsible to quarantining / sandboxing potential agents.
// TODO: some potenmtial approached:
// 1. using a custom "router" - use an EC2 instance to implement logic, and have everything go through it
// 2. segment the subnets, separate bad actors and give them a different gateway which will be the proxy
// 3. at the host level create a different default route into the proxy
// 4. transit gateway
// 5. VPC peering