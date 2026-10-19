// Linux x86_64 inherited seccomp filter: no INET/INET6/other new sockets,
// no connect or datagram/message sends. No_new_privs prevents privilege escape.
#define _GNU_SOURCE
#include <linux/seccomp.h>
#include <linux/filter.h>
#include <linux/audit.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <stddef.h>
#include <errno.h>
#include <stdio.h>
#include <unistd.h>
#define DENY(n) BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,n,0,1),BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ERRNO|EPERM)
int main(int argc,char**argv){
 if(argc<2)return 64;
 struct sock_filter f[]={
  BPF_STMT(BPF_LD|BPF_W|BPF_ABS,offsetof(struct seccomp_data,arch)),
  BPF_JUMP(BPF_JMP|BPF_JEQ|BPF_K,AUDIT_ARCH_X86_64,1,0),
  BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_KILL_PROCESS),
  BPF_STMT(BPF_LD|BPF_W|BPF_ABS,offsetof(struct seccomp_data,nr)),
  // Reject x32 syscall numbers as well as unknown architecture.
  BPF_JUMP(BPF_JMP|BPF_JGE|BPF_K,0x40000000,0,1),
  BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_KILL_PROCESS),
  DENY(__NR_socket),DENY(__NR_connect),DENY(__NR_sendto),DENY(__NR_sendmsg),DENY(__NR_sendmmsg),
  DENY(__NR_io_uring_setup),DENY(__NR_io_uring_enter),DENY(__NR_io_uring_register),
  BPF_STMT(BPF_RET|BPF_K,SECCOMP_RET_ALLOW)
 };
 struct sock_fprog p={.len=sizeof(f)/sizeof(f[0]),.filter=f};
 if(prctl(PR_SET_NO_NEW_PRIVS,1,0,0,0)||prctl(PR_SET_SECCOMP,SECCOMP_MODE_FILTER,&p)){perror("seccomp");return 65;}
 execv(argv[1],argv+1);perror("execv");return 66;
}
